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
  const transcript = '2026年6月21日下午，现场拜访多联系人写入测试-20260621-绍兴微装，客户在绍兴，属于智能装备行业。参会人包括采购部周经理和设备工程部吴工。周经理关注价格、付款条件和交期，吴工关注设备接口、节拍稳定性和维护便利性。客户准备在三季度扩建一条装配线，态度积极。下一步下周四前发送技术方案、接口清单、交期计划和初步报价，并约周经理和吴工一起参加线上评审。';
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
      const generatedAt = Date.now();
      while (Date.now() - generatedAt < 120000) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const text = document.body.innerText;
        const meta = document.querySelector('#ai-result-meta')?.textContent || '';
        const draftText = document.querySelector('#ai-draft-results')?.innerText || '';
        if (meta.includes('${transcript.length} 字') && text.includes('联系人草稿 1') && text.includes('联系人草稿 2') && draftText.includes('周经理') && draftText.includes('吴工')) break;
      }
      window.confirm = () => true;
      document.querySelector('#ai-confirm-drafts').click();
      const confirmedAt = Date.now();
      while (Date.now() - confirmedAt < 60000) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const toast = document.querySelector('#toast')?.textContent || '';
        if (toast.includes('已全部写入')) break;
      }
      return {
        meta: document.querySelector('#ai-result-meta')?.textContent || '',
        toast: document.querySelector('#toast')?.textContent || '',
        draftText: document.querySelector('#ai-draft-results')?.innerText || '',
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
