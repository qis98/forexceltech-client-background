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
  const transcript = '6月20日到上海精密制造拜访，地点在客户二楼会议室。张总负责拍板，周主任负责技术评估。客户准备升级检测设备，重点关注稳定性、售后和付款条件。下一步约下周三线上技术评审。';
  const expression = `
    (async () => {
      document.querySelector('[data-view="ai-entry"]').click();
      await new Promise((resolve) => setTimeout(resolve, 500));
      const clearButton = document.querySelector('#ai-clear-drafts');
      if (clearButton) {
        clearButton.click();
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      const textarea = document.querySelector('#ai-transcript');
      textarea.value = ${JSON.stringify(transcript)};
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('#ai-generate-drafts').click();
      const start = Date.now();
      while (Date.now() - start < 120000) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const meta = document.querySelector('#ai-result-meta')?.textContent || '';
        const text = document.body.innerText;
        if (meta.includes('${transcript.length} 字') && text.includes('客户匹配确认')) break;
      }
      window.confirm = () => true;
      document.querySelector('#ai-confirm-drafts').click();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return {
        meta: document.querySelector('#ai-result-meta')?.textContent || '',
        toast: document.querySelector('#toast')?.textContent || '',
        resolutionText: document.querySelector('.ai-customer-resolution')?.innerText || '',
        bodyText: document.body.innerText
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
