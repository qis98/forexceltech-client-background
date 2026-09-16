const { spawn } = require('node:child_process');

const electron = 'D:/Codex/Test/ClientBackground/node_modules/electron/dist/electron.exe';
const child = spawn(electron, ['.', '--remote-debugging-port=9445'], {
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
      const response = await fetch('http://127.0.0.1:9445/json');
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
    client = await createCdpClient(await waitForTarget());
    await client.call('Runtime.enable');
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const result = await client.call('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => {
          document.querySelector('[data-view="customers"]')?.click();
          await new Promise((resolve) => setTimeout(resolve, 300));
          document.querySelector('#new-customer-page')?.click();
          await new Promise((resolve) => setTimeout(resolve, 500));
          const dialog = document.querySelector('#entity-dialog');
          const cityInitiallyDisabled = document.querySelector('#city-trigger')?.disabled === true;
          document.querySelector('#city-trigger')?.click();
          await new Promise((resolve) => setTimeout(resolve, 150));
          const blockedMessage = document.querySelector('#dialog-message')?.innerText || '';
          const cityPanelInitiallyHidden = document.querySelector('[data-location-panel="city"]')?.hidden === true;

          document.querySelector('#address').value = '宁波市鄞州区测试路1号';
          document.querySelector('#recognize-address')?.click();
          await new Promise((resolve) => setTimeout(resolve, 250));
          const recognized = {
            region: document.querySelector('#region')?.value || '',
            regionDisplay: document.querySelector('#region-display')?.value || '',
            province: document.querySelector('#province')?.value || '',
            city: document.querySelector('#city')?.value || '',
            message: document.querySelector('#dialog-message')?.innerText || '',
            cityDisabled: document.querySelector('#city-trigger')?.disabled === true
          };

          document.querySelector('#province-trigger')?.click();
          await new Promise((resolve) => setTimeout(resolve, 150));
          const provincePanel = document.querySelector('[data-location-panel="province"]');
          const provincePanelMetrics = provincePanel ? {
            hidden: provincePanel.hidden,
            optionCount: provincePanel.querySelectorAll('.location-picker-option').length,
            clientHeight: provincePanel.clientHeight,
            scrollHeight: provincePanel.scrollHeight
          } : null;

          document.querySelector('[data-location-panel="province"] [data-value="广东"]')?.click();
          await new Promise((resolve) => setTimeout(resolve, 150));
          document.querySelector('#city-trigger')?.click();
          await new Promise((resolve) => setTimeout(resolve, 150));
          const cityOptions = Array.from(document.querySelectorAll('[data-location-panel="city"] .location-picker-option')).map((item) => item.dataset.value);

          return {
            dialogOpen: dialog?.open === true,
            cityInitiallyDisabled,
            cityPanelInitiallyHidden,
            blockedMessage,
            recognized,
            provincePanelMetrics,
            afterProvinceChange: {
              region: document.querySelector('#region')?.value || '',
              province: document.querySelector('#province')?.value || '',
              city: document.querySelector('#city')?.value || ''
            },
            cityOptionsFirstFive: cityOptions.slice(0, 5),
            cityOptionsContainOnlyGuangdongCommonCities: cityOptions.includes('广州') && cityOptions.includes('深圳') && !cityOptions.includes('宁波')
          };
        })()
      `
    });

    const value = result.result.value;
    console.log(JSON.stringify(value, null, 2));

    if (
      !value.dialogOpen ||
      !value.cityInitiallyDisabled ||
      !value.cityPanelInitiallyHidden ||
      value.recognized.region !== '华东' ||
      value.recognized.province !== '浙江' ||
      value.recognized.city !== '宁波' ||
      !value.recognized.message.includes('地址识别完成') ||
      value.recognized.cityDisabled ||
      value.provincePanelMetrics?.hidden ||
      value.provincePanelMetrics?.optionCount < 30 ||
      value.provincePanelMetrics?.clientHeight > 280 ||
      value.afterProvinceChange.region !== '华南' ||
      value.afterProvinceChange.province !== '广东' ||
      value.afterProvinceChange.city !== '' ||
      !value.cityOptionsContainOnlyGuangdongCommonCities
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
