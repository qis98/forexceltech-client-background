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
  const transcript = '2026年6月21日上午，我拜访了Ollama模拟测试-20260621-宁波封测，客户在宁波，属于半导体封装测试行业。本次在客户会议室沟通，主要参会人是生产设备部赵经理和工艺工程师孙工。赵经理负责新产线设备选型，关注交期、稳定性和售后响应；孙工反馈目前贴装段良率波动，想了解我们设备在精度补偿和节拍优化方面的案例。客户计划三季度启动一条新封测线，态度比较积极。下一步我需要在下周二前发送技术方案、设备配置清单和初步报价，并约赵经理安排线上技术评审。';

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
        if (meta.includes('${transcript.length} 字') && (meta.includes('Ollama') || meta.includes('本地规则')) && text.includes('客户草稿')) break;
      }
      return {
        meta: document.querySelector('#ai-result-meta')?.textContent || '',
        status: document.querySelector('#toast')?.textContent || '',
        draftText: document.querySelector('#ai-draft-results')?.innerText || '',
        confirmDisabled: document.querySelector('#ai-confirm-drafts')?.disabled,
        transcriptLength: textarea.value.length
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
