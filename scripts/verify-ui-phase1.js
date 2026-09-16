const { spawn } = require('node:child_process');

const electron = 'D:/Codex/Test/ClientBackground/node_modules/electron/dist/electron.exe';
const child = spawn(electron, ['.', '--remote-debugging-port=9446'], {
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
      const response = await fetch('http://127.0.0.1:9446/json');
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

    await client.call('Runtime.evaluate', {
      expression: 'document.querySelector("[data-view=\\"contacts\\"]")?.click()'
    });
    await wait(1200);
    await client.call('Runtime.evaluate', {
      expression: "document.querySelector('#all-contacts-list .unified-record-item')?.click()"
    });
    await wait(500);
    const contact = await client.call('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => ({
        navIcons: document.querySelectorAll('.nav-item .ui-icon').length,
        topbarIcons: document.querySelectorAll('.topbar .ui-icon').length,
        contactItems: document.querySelectorAll('#all-contacts-list .unified-record-item').length,
        contactKindIcons: document.querySelectorAll('#all-contacts-list .record-kind-icon .ui-icon').length,
        contactDialog: document.querySelector('#detail-dialog')?.open && document.querySelector('#detail-dialog-title')?.textContent === '联系人详情'
      }))()`
    });

    await client.call('Runtime.evaluate', {
      expression: 'document.querySelector("#detail-dialog-close")?.click(); document.querySelector("[data-view=\\"visits\\"]")?.click()'
    });
    await wait(1200);
    await client.call('Runtime.evaluate', {
      expression: "document.querySelector('#all-visits-list .unified-record-item')?.click()"
    });
    await wait(500);
    const visit = await client.call('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => ({
        visitItems: document.querySelectorAll('#all-visits-list .unified-record-item').length,
        visitTimeBlocks: document.querySelectorAll('#all-visits-list .record-time-block').length,
        visitDialog: document.querySelector('#detail-dialog')?.open && document.querySelector('#detail-dialog-title')?.textContent === '拜访记录详情'
      }))()`
    });

    const result = {
      ...contact.result.value,
      ...visit.result.value
    };
    console.log(JSON.stringify(result, null, 2));

    if (
      result.navIcons < 6 ||
      result.topbarIcons < 4 ||
      result.contactItems < 1 ||
      result.contactKindIcons < 1 ||
      !result.contactDialog ||
      result.visitItems < 1 ||
      result.visitTimeBlocks < 1 ||
      !result.visitDialog
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
