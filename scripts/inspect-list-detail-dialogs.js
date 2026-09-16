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
      document.querySelectorAll('dialog[open]').forEach((dialog) => dialog.close());
      document.querySelector('[data-view="contacts"]').click();
      await new Promise((resolve) => setTimeout(resolve, 800));
      const contactCard = document.querySelector('#all-contacts-list [data-action="open-contact-detail"]');
      contactCard?.click();
      await new Promise((resolve) => setTimeout(resolve, 300));
      const contactState = {
        dialogOpen: document.querySelector('#detail-dialog')?.open || false,
        title: document.querySelector('#detail-dialog-title')?.textContent || '',
        hasViewCustomer: Boolean(document.querySelector('#detail-dialog-actions [data-action="view-customer"]')),
        hasEdit: Boolean(document.querySelector('#detail-dialog-actions [data-action="edit-contact"]')),
        activeView: document.querySelector('.view.active')?.id || ''
      };
      document.querySelector('#detail-dialog-close')?.click();
      await new Promise((resolve) => setTimeout(resolve, 200));

      document.querySelector('[data-view="visits"]').click();
      await new Promise((resolve) => setTimeout(resolve, 800));
      const visitCard = document.querySelector('#all-visits-list [data-action="open-visit-detail"]');
      visitCard?.click();
      await new Promise((resolve) => setTimeout(resolve, 300));
      const visitState = {
        dialogOpen: document.querySelector('#detail-dialog')?.open || false,
        title: document.querySelector('#detail-dialog-title')?.textContent || '',
        hasViewCustomer: Boolean(document.querySelector('#detail-dialog-actions [data-action="view-customer"]')),
        hasEdit: Boolean(document.querySelector('#detail-dialog-actions [data-action="edit-visit"]')),
        hasTimeBadge: Boolean(document.querySelector('#detail-dialog .visit-time-badge')),
        activeView: document.querySelector('.view.active')?.id || ''
      };
      return { contactState, visitState };
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
