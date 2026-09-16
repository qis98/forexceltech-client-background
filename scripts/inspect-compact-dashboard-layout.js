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
    throw new Error('未找到 Electron 页面调试目标。请先用 --remote-debugging-port=9223 启动应用。');
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
      document.querySelector('[data-view="dashboard"]').click();
      await new Promise((resolve) => setTimeout(resolve, 800));
      const metrics = [...document.querySelectorAll('#dashboard-view .metric')].map((el) => el.getBoundingClientRect());
      const panel = document.querySelector('#dashboard-view .panel').getBoundingClientRect();
      const recent = document.querySelector('#recent-customers').getBoundingClientRect();
      const header = document.querySelector('#dashboard-view .page-header').getBoundingClientRect();
      return {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        metricRows: new Set(metrics.map((rect) => Math.round(rect.top))).size,
        metricWidths: metrics.map((rect) => Math.round(rect.width)),
        headerBottom: Math.round(header.bottom),
        panelTop: Math.round(panel.top),
        panelBottom: Math.round(panel.bottom),
        recentTop: Math.round(recent.top),
        recentBottom: Math.round(recent.bottom),
        panelStartsInViewport: panel.top < window.innerHeight,
        recentStartsInViewport: recent.top < window.innerHeight
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
