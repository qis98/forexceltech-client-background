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
      document.querySelector('[data-view="customers"]').click();
      await new Promise((resolve) => setTimeout(resolve, 800));
      document.querySelector('#customer-list .customer-card')?.click();
      await new Promise((resolve) => setTimeout(resolve, 800));
      const detailButtons = [...document.querySelectorAll('.detail-title-row .detail-actions button')].map((button) => button.getBoundingClientRect());
      const detailButtonRows = new Set(detailButtons.map((rect) => Math.round(rect.top))).size;
      const detailButtonCols = new Set(detailButtons.map((rect) => Math.round(rect.left))).size;
      document.querySelector('#detail-dialog-close')?.click();
      await new Promise((resolve) => setTimeout(resolve, 300));

      document.querySelector('[data-view="ai-entry"]').click();
      await new Promise((resolve) => setTimeout(resolve, 800));
      const aiLayout = document.querySelector('.ai-entry-layout').getBoundingClientRect();
      const resultPanel = document.querySelector('.ai-result-panel').getBoundingClientRect();
      const aiDraftGridStyle = getComputedStyle(document.querySelector('.ai-field-grid') || document.body).gridTemplateColumns;

      document.querySelector('[data-view="visits"]').click();
      await new Promise((resolve) => setTimeout(resolve, 800));
      const timeBadge = document.querySelector('.view.active .visit-time-badge');
      const visitGrid = document.querySelector('.view.active .visit-record-grid');
      const visitContent = visitGrid?.children?.[1];
      const timeBadgeRect = timeBadge?.getBoundingClientRect();
      const visitGridRect = visitGrid?.getBoundingClientRect();
      const visitContentRect = visitContent?.getBoundingClientRect();
      return {
        detailButtons: { rows: detailButtonRows, cols: detailButtonCols, count: detailButtons.length },
        ai: {
          layoutHeight: Math.round(aiLayout.height),
          resultPanelHeight: Math.round(resultPanel.height),
          fieldGridTemplate: aiDraftGridStyle
        },
        visits: {
          hasTimeBadge: Boolean(timeBadge),
          timeBadgeText: timeBadge?.innerText || '',
          timeBadgeLeft: timeBadgeRect ? Math.round(timeBadgeRect.left) : null,
          timeBadgeFullRow: Boolean(timeBadgeRect && visitGridRect && Math.round(timeBadgeRect.left) === Math.round(visitGridRect.left) && Math.round(timeBadgeRect.right) === Math.round(visitGridRect.right)),
          contentBelowBadge: Boolean(timeBadgeRect && visitContentRect && visitContentRect.top > timeBadgeRect.bottom),
          contentWidth: visitContentRect ? Math.round(visitContentRect.width) : null
        }
      };
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
