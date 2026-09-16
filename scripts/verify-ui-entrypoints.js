const { spawn } = require('node:child_process');

const electron = 'D:/Codex/Test/ClientBackground/node_modules/electron/dist/electron.exe';
const child = spawn(electron, ['.', '--remote-debugging-port=9444'], {
  cwd: 'D:/Codex/Test/ClientBackground',
  windowsHide: true,
  env: {
    ...process.env,
    PATH: `D:\\DevTools\\NodeJS;D:\\DevTools\\SQLite;${process.env.PATH || ''}`
  }
});

async function waitForTarget() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch('http://127.0.0.1:9444/json');
      const targets = await response.json();
      const page = targets.find((item) => item.type === 'page' && item.webSocketDebuggerUrl);
      if (page) {
        return page.webSocketDebuggerUrl;
      }
    } catch {
      // Electron may still be booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
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
    const wsUrl = await waitForTarget();
    client = await createCdpClient(wsUrl);
    await client.call('Runtime.enable');
    await new Promise((resolve) => setTimeout(resolve, 2500));

    await client.call('Runtime.evaluate', {
      expression: "document.querySelector('#settings-top')?.click()"
    });
    await new Promise((resolve) => setTimeout(resolve, 800));
    const settingsResult = await client.call('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => ({
        settingsActive: document.querySelector('#settings-view')?.classList.contains('active'),
        hasSettingsForm: !!document.querySelector('#settings-form'),
        leftNavSettings: !!document.querySelector('[data-view="settings"]')
      }))()`
    });

    await client.call('Runtime.evaluate', {
      expression: 'document.querySelector("[data-view=\\"customer-map\\"]")?.click()'
    });
    await new Promise((resolve) => setTimeout(resolve, 1800));
    const mapResult = await client.call('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => ({
        mapActive: document.querySelector('#customer-map-view')?.classList.contains('active'),
        neighborCount: window.FOREXCELTECH_NEIGHBOR_GEOJSON?.countries?.features?.length || 0,
        canvasCount: document.querySelectorAll('#customer-map-canvas canvas').length,
        svgCount: document.querySelectorAll('#customer-map-canvas svg').length,
        hasEchartsInstance: !!window.echarts?.getInstanceByDom(document.querySelector('#customer-map-canvas')),
        mapTitle: document.querySelector('#map-title')?.textContent
      }))()`
    });

    const result = {
      ...settingsResult.result.value,
      ...mapResult.result.value
    };
    console.log(JSON.stringify(result, null, 2));

    if (
      !result.settingsActive ||
      !result.hasSettingsForm ||
      result.leftNavSettings ||
      !result.mapActive ||
      result.neighborCount < 10 ||
      !result.hasEchartsInstance ||
      result.mapTitle !== '客户分布'
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
