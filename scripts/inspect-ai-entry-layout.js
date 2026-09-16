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
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1260,
    height: 720,
    deviceScaleFactor: 1,
    mobile: false
  });
  return { ws, send };
}

async function main() {
  const { ws, send } = await connectToPage();
  const expression = `
    (async () => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      document.querySelectorAll('dialog[open]').forEach((dialog) => dialog.close());
      document.querySelector('[data-view="ai-entry"]').click();
      await sleep(800);
      document.querySelector('#ai-load-sample').click();
      await sleep(200);
      document.querySelector('#ai-generate-drafts').click();
      const started = Date.now();
      while (Date.now() - started < 45000) {
        if (document.querySelectorAll('.ai-draft-card').length >= 3 && !document.querySelector('#ai-generate-drafts').disabled) {
          break;
        }
        await sleep(500);
      }

      const getState = () => {
        const viewportHeight = window.innerHeight;
        const actionRect = document.querySelector('.ai-actions').getBoundingClientRect();
        const resultRect = document.querySelector('.ai-result-panel').getBoundingClientRect();
        const draftCards = [...document.querySelectorAll('.ai-draft-card')];
        return {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          actionVisible: actionRect.bottom <= viewportHeight && actionRect.top >= 0,
          actionBottom: Math.round(actionRect.bottom),
          resultPanelVisible: resultRect.bottom > 160 && resultRect.top < viewportHeight,
          draftCount: draftCards.length,
          collapsedCount: draftCards.filter((card) => card.classList.contains('collapsed')).length
        };
      };

      const initial = getState();
      const firstToggle = document.querySelector('.ai-draft-card [data-action="toggle-ai-draft"]');
      firstToggle?.click();
      await sleep(200);
      const firstInput = document.querySelector('.ai-draft-card:not(.collapsed) input, .ai-draft-card:not(.collapsed) textarea');
      if (firstInput) {
        firstInput.focus();
        firstInput.value = firstInput.value || '测试编辑';
        firstInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const expanded = {
        expandedCards: document.querySelectorAll('.ai-draft-card:not(.collapsed)').length,
        editableFieldVisible: Boolean(firstInput),
        activeFieldTag: firstInput?.tagName || ''
      };

      return { initial, expanded };
    })()
  `;
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1000,
    height: 700,
    deviceScaleFactor: 1,
    mobile: false
  });
  const compactExpression = `
    (() => {
      const actionRect = document.querySelector('.ai-actions').getBoundingClientRect();
      const resultRect = document.querySelector('.ai-result-panel').getBoundingClientRect();
      const draftCards = [...document.querySelectorAll('.ai-draft-card')];
      return {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        actionVisible: actionRect.bottom <= window.innerHeight && actionRect.top >= 0,
        resultPanelVisible: resultRect.bottom > 160 && resultRect.top < window.innerHeight,
        draftCount: draftCards.length,
        collapsedCount: draftCards.filter((card) => card.classList.contains('collapsed')).length,
        expandedCards: document.querySelectorAll('.ai-draft-card:not(.collapsed)').length,
        editableFieldVisible: Boolean(document.querySelector('.ai-draft-card:not(.collapsed) input, .ai-draft-card:not(.collapsed) textarea'))
      };
    })()
  `;
  const compact = await send('Runtime.evaluate', { expression: compactExpression, returnByValue: true });
  console.log(JSON.stringify({ normal: result.result.value, compact: compact.result.value }, null, 2));
  ws.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
