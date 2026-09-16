const { spawn } = require('node:child_process');

const electron = 'D:/Codex/Test/ClientBackground/node_modules/electron/dist/electron.exe';
const child = spawn(electron, ['.', '--remote-debugging-port=9450'], {
  cwd: 'D:/Codex/Test/ClientBackground',
  windowsHide: true,
  env: {
    ...process.env,
    PATH: `D:\\DevTools\\NodeJS;D:\\DevTools\\SQLite;${process.env.PATH || ''}`
  }
});

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForTarget() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch('http://127.0.0.1:9450/json');
      const targets = await response.json();
      const page = targets.find((item) => item.type === 'page' && item.webSocketDebuggerUrl);
      if (page) {
        return page.webSocketDebuggerUrl;
      }
    } catch {
      // Electron may still be booting.
    }
    await wait(500);
  }
  throw new Error('DevTools target not available');
}

function createCdpClient(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();

    ws.onopen = () => resolve({
      call(method, params = {}) {
        const callId = ++id;
        ws.send(JSON.stringify({ id: callId, method, params }));
        return new Promise((res, rej) => pending.set(callId, { res, rej }));
      },
      close() {
        ws.close();
      }
    });
    ws.onerror = reject;
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !pending.has(message.id)) {
        return;
      }
      const { res, rej } = pending.get(message.id);
      pending.delete(message.id);
      message.error ? rej(new Error(message.error.message)) : res(message.result);
    };
  });
}

async function main() {
  let client;
  try {
    client = await createCdpClient(await waitForTarget());
    await client.call('Runtime.enable');
    await wait(2500);

    const result = await client.call('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => {
          document.querySelector('#settings-top')?.click();
          await new Promise((resolve) => setTimeout(resolve, 500));
          document.querySelector('[data-calendar-scheme="morandi"]')?.click();
          await new Promise((resolve) => setTimeout(resolve, 150));
          const visitedPreview = document.querySelector('[data-preview="visited"]');
          const plannedPreview = document.querySelector('[data-preview="planned"]');
          return {
            active: document.querySelector('#settings-view')?.classList.contains('active') === true,
            panelTitle: document.querySelector('#settings-view .panel-header h2')?.innerText || '',
            cardTitles: Array.from(document.querySelectorAll('.settings-card-head h3')).map((item) => item.innerText),
            schemeCount: document.querySelectorAll('[data-calendar-scheme]').length,
            activeScheme: document.querySelector('[data-calendar-scheme].active')?.dataset.calendarScheme || '',
            visitedValue: document.querySelector('#settings-calendar-visited')?.value || '',
            plannedValue: document.querySelector('#settings-calendar-planned')?.value || '',
            visitedPreviewBg: getComputedStyle(visitedPreview).backgroundColor,
            plannedPreviewBg: getComputedStyle(plannedPreview).backgroundColor,
            saveButton: document.querySelector('#settings-save')?.innerText || '',
            testButton: document.querySelector('#settings-test')?.innerText || '',
            configPath: document.querySelector('#settings-config-path')?.innerText || '',
            databasePath: document.querySelector('#settings-db-path')?.innerText || '',
            leftNavSettings: !!document.querySelector('[data-view="settings"]')
          };
        })()
      `
    });

    const value = result.result.value;
    console.log(JSON.stringify(value, null, 2));

    const titles = value.cardTitles || [];
    if (
      !value.active ||
      value.panelTitle !== '设置' ||
      !titles.includes('智能录入') ||
      !titles.includes('工作台日历') ||
      !titles.includes('数据位置') ||
      value.schemeCount !== 3 ||
      value.activeScheme !== 'morandi' ||
      value.visitedValue.toLowerCase() !== '#a3e1d4' ||
      value.plannedValue.toLowerCase() !== '#f8c4cc' ||
      value.visitedPreviewBg !== 'rgb(163, 225, 212)' ||
      value.plannedPreviewBg !== 'rgb(248, 196, 204)' ||
      value.saveButton !== '保存设置' ||
      value.testButton !== '测试连接' ||
      !value.configPath.includes('D:\\FOREXCELTECHClientManager\\config.json') ||
      !value.databasePath.includes('D:\\FOREXCELTECHClientManager\\data.db') ||
      value.leftNavSettings
    ) {
      process.exitCode = 1;
    }
  } finally {
    client?.close();
    child.kill();
    setTimeout(() => process.exit(process.exitCode || 0), 500);
  }
}

main().catch((error) => {
  console.error(error);
  child.kill();
  process.exit(1);
});
