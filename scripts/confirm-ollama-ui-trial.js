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
      const setDraftValue = (type, key, value) => {
        const input = document.querySelector('[data-draft-type="' + type + '"][data-field-key="' + key + '"]');
        if (!input) return false;
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      };
      const patches = {
        customerName: setDraftValue('customer', 'name', 'Ollama模拟测试-20260621-宁波封测'),
        customerShortName: setDraftValue('customer', 'short_name', '宁波封测'),
        visitSubject: setDraftValue('visit', 'subject', '宁波封测新产线设备选型沟通'),
        visitSummary: setDraftValue('visit', 'summary', '在客户会议室沟通新产线设备选型。赵经理关注交期、稳定性和售后响应；孙工反馈贴装段良率波动，希望了解精度补偿和节拍优化案例。客户计划三季度启动一条新封测线，态度积极。')
      };
      document.querySelector('#ai-confirm-drafts').click();
      const start = Date.now();
      while (Date.now() - start < 30000) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const toast = document.querySelector('#toast')?.textContent || '';
        const text = document.body.innerText;
        if (toast.includes('已全部写入') || text.includes('已写入')) break;
      }
      return {
        patches,
        toast: document.querySelector('#toast')?.textContent || '',
        resultText: document.querySelector('#ai-draft-results')?.innerText || ''
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
