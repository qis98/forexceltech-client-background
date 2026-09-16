const { spawn } = require('node:child_process');

const electron = 'D:/Codex/Test/ClientBackground/node_modules/electron/dist/electron.exe';
const child = spawn(electron, ['.', '--remote-debugging-port=9447'], {
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
      const response = await fetch('http://127.0.0.1:9447/json');
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
      expression: 'document.querySelector("[data-view=\\"visits\\"]")?.click()'
    });
    await wait(1200);
    const visitsBefore = await client.call('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const firstTitle = document.querySelector('#all-visits-list .record-title')?.textContent || '';
        return {
          firstTitle,
          itemCount: document.querySelectorAll('#all-visits-list .unified-record-item').length,
          paginationVisible: !document.querySelector('#visits-pagination')?.hidden,
          pageText: document.querySelector('#visits-pagination .pagination-actions span')?.textContent || '',
          pageSize: document.querySelector('#visits-pagination [data-page-size]')?.value || '',
          shortDate: document.querySelector('#all-visits-list .record-time-block strong')?.textContent || ''
        };
      })()`
    });
    await client.call('Runtime.evaluate', {
      expression: "document.querySelector('#visits-pagination [data-page-action=\"next\"]')?.click()"
    });
    await wait(500);
    const visitsAfter = await client.call('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => ({
        firstTitleAfter: document.querySelector('#all-visits-list .record-title')?.textContent || '',
        pageTextAfter: document.querySelector('#visits-pagination .pagination-actions span')?.textContent || ''
      }))()`
    });

    await client.call('Runtime.evaluate', {
      expression: 'document.querySelector("[data-view=\\"customers\\"]")?.click()'
    });
    await wait(1200);
    await client.call('Runtime.evaluate', {
      expression: "document.querySelector('#customer-list .customer-card')?.click()"
    });
    await wait(600);
    const customerDetail = await client.call('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => ({
        customersPageCount: document.querySelectorAll('#customer-list .customer-card').length,
        customerPaginationVisible: !document.querySelector('#customer-pagination')?.hidden,
        detailOpen: document.querySelector('#detail-dialog')?.open,
        actionCount: document.querySelectorAll('.customer-detail-actions button').length,
        primaryActions: document.querySelectorAll('.customer-detail-actions .primary-button').length,
        secondaryActions: document.querySelectorAll('.customer-detail-actions .secondary-button').length,
        dangerActions: document.querySelectorAll('.customer-detail-actions .danger-button').length,
        hasTags: !!document.querySelector('.customer-detail-tags')
      }))()`
    });

    const result = {
      ...visitsBefore.result.value,
      ...visitsAfter.result.value,
      ...customerDetail.result.value
    };
    console.log(JSON.stringify(result, null, 2));

    if (
      result.itemCount !== 50 ||
      !result.paginationVisible ||
      result.pageSize !== '50' ||
      !/^第 1 \//.test(result.pageText) ||
      !/^第 2 \//.test(result.pageTextAfter) ||
      result.firstTitle === result.firstTitleAfter ||
      !/^\d{2}\/\d{1,2}\/\d{1,2}$/.test(result.shortDate) ||
      result.customersPageCount > 50 ||
      !result.customerPaginationVisible ||
      !result.detailOpen ||
      result.actionCount !== 4 ||
      result.primaryActions !== 0 ||
      result.secondaryActions !== 3 ||
      result.dangerActions !== 1 ||
      !result.hasTags
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
