const http = require('node:http');

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function connectToPage() {
  const targets = await getJson('http://localhost:9223/json');
  const page = targets.find((target) => target.type === 'page');
  if (!page) {
    throw new Error('未找到 Electron 页面调试目标。');
  }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) {
        reject(new Error(JSON.stringify(message.error)));
      } else {
        resolve(message.result);
      }
    }
  });
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id;
    pending.set(requestId, { resolve, reject });
    ws.send(JSON.stringify({ id: requestId, method, params }));
  });
  await send('Runtime.enable');
  return { ws, send };
}

async function main() {
  const { ws, send } = await connectToPage();
  const expression = `
    (async () => {
      document.querySelector('[data-view="customers"]').click();
      await new Promise((resolve) => setTimeout(resolve, 800));
      const initial = {
        activeView: document.querySelector('.view.active')?.id || '',
        listHidden: document.querySelector('#customer-list-mode')?.hidden || false,
        detailHidden: document.querySelector('#customer-detail')?.hidden || false,
        cardCount: document.querySelectorAll('#customer-list .customer-card').length
      };

      document.querySelector('#customer-list .customer-card')?.click();
      await new Promise((resolve) => setTimeout(resolve, 900));
      const detail = {
        listHidden: document.querySelector('#customer-list-mode')?.hidden || false,
        detailHidden: document.querySelector('#customer-detail')?.hidden || false,
        dialogOpen: document.querySelector('#detail-dialog')?.open || false,
        dialogTitle: document.querySelector('#detail-dialog-title')?.innerText || '',
        hasDetailTitle: Boolean(document.querySelector('#detail-dialog .detail-title h2'))
      };

      document.querySelector('#detail-dialog-close')?.click();
      await new Promise((resolve) => setTimeout(resolve, 400));
      const back = {
        listHidden: document.querySelector('#customer-list-mode')?.hidden || false,
        detailHidden: document.querySelector('#customer-detail')?.hidden || false,
        dialogOpen: document.querySelector('#detail-dialog')?.open || false
      };

      document.querySelector('[data-view="contacts"]').click();
      await new Promise((resolve) => setTimeout(resolve, 800));
      document.querySelector('#all-contacts-list [data-action="open-contact-detail"]')?.click();
      await new Promise((resolve) => setTimeout(resolve, 300));
      document.querySelector('#detail-dialog-actions [data-action="view-customer"]')?.click();
      await new Promise((resolve) => setTimeout(resolve, 900));
      const fromDialog = {
        activeView: document.querySelector('.view.active')?.id || '',
        listHidden: document.querySelector('#customer-list-mode')?.hidden || false,
        detailHidden: document.querySelector('#customer-detail')?.hidden || false,
        dialogOpen: document.querySelector('#detail-dialog')?.open || false,
        dialogTitle: document.querySelector('#detail-dialog-title')?.innerText || '',
        hasDetailTitle: Boolean(document.querySelector('#detail-dialog .detail-title h2'))
      };
      return { initial, detail, back, fromDialog };
    })()
  `;
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  console.log(JSON.stringify(result.result.value, null, 2));
  ws.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
