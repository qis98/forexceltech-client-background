const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const outputPath = 'D:/FOREXCELTECHClientManager/temp/customer-map-check.png';
const electron = 'D:/Codex/Test/ClientBackground/node_modules/electron/dist/electron.exe';
const child = spawn(electron, ['.', '--remote-debugging-port=9555'], {
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
      const response = await fetch('http://127.0.0.1:9555/json');
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
    await client.call('Page.enable');
    await client.call('Emulation.setDeviceMetricsOverride', {
      width: 1600,
      height: 940,
      deviceScaleFactor: 1,
      mobile: false
    });
    await new Promise((resolve) => setTimeout(resolve, 2200));
    await client.call('Runtime.evaluate', {
      expression: 'document.querySelector("[data-view=\\"customer-map\\"]")?.click()'
    });
    await new Promise((resolve) => setTimeout(resolve, 2200));
    const screenshot = await client.call('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true
    });
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, Buffer.from(screenshot.data, 'base64'));
    console.log(outputPath);
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
