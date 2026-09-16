const { spawn } = require('node:child_process');

const electron = 'D:/Codex/Test/ClientBackground/node_modules/electron/dist/electron.exe';
const child = spawn(electron, ['.', '--remote-debugging-port=9448'], {
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
      const response = await fetch('http://127.0.0.1:9448/json');
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

async function evaluate(client, expression) {
  const result = await client.call('Runtime.evaluate', { returnByValue: true, expression });
  return result.result.value;
}

async function openView(client, view) {
  await client.call('Runtime.evaluate', {
    expression: `document.querySelector('[data-view="${view}"]')?.click()`
  });
  await wait(1000);
}

async function main() {
  let client;
  try {
    client = await createCdpClient(await waitForTarget());
    await client.call('Runtime.enable');
    await wait(2500);

    await openView(client, 'customers');
    await client.call('Runtime.evaluate', {
      expression: "document.querySelector('#customer-list .customer-card')?.click()"
    });
    await wait(600);
    const customerDetail = await evaluate(client, `(() => ({
      customerOpen: document.querySelector('#detail-dialog')?.open,
      customerHero: !!document.querySelector('#detail-dialog .unified-detail-hero.customer-detail-hero'),
      customerBadges: document.querySelectorAll('#detail-dialog .detail-badge').length,
      customerGrid: !!document.querySelector('#detail-dialog .detail-dialog-grid'),
      customerTextBlocks: document.querySelectorAll('#detail-dialog .detail-text-block').length,
      customerTopActionButtons: document.querySelectorAll('#detail-dialog-body .customer-detail-actions button').length,
      customerFooterActions: document.querySelectorAll('#detail-dialog-actions .customer-detail-actions button').length,
      customerFooterLeft: !!document.querySelector('#detail-dialog-actions .dialog-action-left'),
      customerDanger: document.querySelectorAll('#detail-dialog-actions .danger-button').length
    }))()`);

    await client.call('Runtime.evaluate', {
      expression: 'document.querySelector("#detail-dialog-close")?.click()'
    });
    await openView(client, 'contacts');
    await client.call('Runtime.evaluate', {
      expression: "document.querySelector('#all-contacts-list .unified-record-item')?.click()"
    });
    await wait(600);
    const contactDetail = await evaluate(client, `(() => ({
      contactOpen: document.querySelector('#detail-dialog')?.open,
      contactHero: !!document.querySelector('#detail-dialog .unified-detail-hero'),
      contactBadges: document.querySelectorAll('#detail-dialog .detail-badge').length,
      contactFooterRight: !!document.querySelector('#detail-dialog-actions .detail-business-actions'),
      contactGrid: !!document.querySelector('#detail-dialog .detail-dialog-grid')
    }))()`);

    await client.call('Runtime.evaluate', {
      expression: 'document.querySelector("#detail-dialog-close")?.click()'
    });
    await openView(client, 'visits');
    await client.call('Runtime.evaluate', {
      expression: "document.querySelector('#all-visits-list .unified-record-item')?.click()"
    });
    await wait(600);
    const visitDetail = await evaluate(client, `(() => ({
      visitOpen: document.querySelector('#detail-dialog')?.open,
      visitHero: !!document.querySelector('#detail-dialog .unified-detail-hero.visit-detail-hero'),
      visitTimeBadge: !!document.querySelector('#detail-dialog .visit-time-badge'),
      visitTextBlocks: document.querySelectorAll('#detail-dialog .detail-text-block').length,
      visitFooterRight: !!document.querySelector('#detail-dialog-actions .detail-business-actions')
    }))()`);

    await client.call('Runtime.evaluate', {
      expression: 'document.querySelector("#detail-dialog-close")?.click(); document.querySelector("[data-view=\\"dashboard\\"]")?.click()'
    });
    await wait(800);
    await client.call('Runtime.evaluate', {
      expression: "document.querySelector('#calendar-grid [data-date]')?.click()"
    });
    await wait(600);
    const calendarDetail = await evaluate(client, `(() => ({
      calendarOpen: document.querySelector('#detail-dialog')?.open,
      calendarHero: !!document.querySelector('#detail-dialog .unified-detail-hero'),
      calendarSections: document.querySelectorAll('#detail-dialog .calendar-detail-section.detail-section-card').length,
      calendarFooterLeft: !!document.querySelector('#detail-dialog-actions .dialog-action-left'),
      calendarFooterRight: !!document.querySelector('#detail-dialog-actions .detail-business-actions')
    }))()`);

    const result = {
      ...customerDetail,
      ...contactDetail,
      ...visitDetail,
      ...calendarDetail
    };
    console.log(JSON.stringify(result, null, 2));

    if (
      !result.customerOpen ||
      !result.customerHero ||
      result.customerBadges < 3 ||
      !result.customerGrid ||
      result.customerTextBlocks < 2 ||
      result.customerTopActionButtons !== 0 ||
      result.customerFooterActions !== 4 ||
      result.customerFooterLeft ||
      result.customerDanger !== 1 ||
      !result.contactOpen ||
      !result.contactHero ||
      result.contactBadges < 2 ||
      !result.contactFooterRight ||
      !result.contactGrid ||
      !result.visitOpen ||
      !result.visitHero ||
      !result.visitTimeBadge ||
      result.visitTextBlocks < 3 ||
      !result.visitFooterRight ||
      !result.calendarOpen ||
      !result.calendarHero ||
      result.calendarSections !== 2 ||
      result.calendarFooterLeft ||
      !result.calendarFooterRight
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
