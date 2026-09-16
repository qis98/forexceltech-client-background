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
          const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

          document.querySelector('#calendar-month-picker')?.click();
          await wait(150);
          const monthPopover = document.querySelector('.calendar-picker-popover');
          const monthBefore = Array.from(monthPopover.querySelectorAll('.calendar-picker-option')).map((button) => button.innerText);
          monthPopover.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true }));
          await wait(80);
          const monthAfter = Array.from(monthPopover.querySelectorAll('.calendar-picker-option')).map((button) => button.innerText);
          const monthActiveAfter = monthPopover.querySelector('.calendar-picker-option.active')?.innerText || '';
          const monthMetrics = {
            width: monthPopover.offsetWidth,
            height: monthPopover.offsetHeight,
            optionCount: monthPopover.querySelectorAll('.calendar-picker-option').length,
            hasScrollbar: !!monthPopover.querySelector('.calendar-picker-scrollbar span'),
            scrollHeight: monthPopover.scrollHeight,
            clientHeight: monthPopover.clientHeight
          };
          document.body.click();
          await wait(120);

          document.querySelector('#calendar-year-picker')?.click();
          await wait(150);
          const yearPopover = document.querySelector('.calendar-picker-popover');
          const yearBefore = Array.from(yearPopover.querySelectorAll('.calendar-picker-option')).map((button) => button.innerText);
          yearPopover.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true }));
          await wait(80);
          const yearAfter = Array.from(yearPopover.querySelectorAll('.calendar-picker-option')).map((button) => button.innerText);
          const yearActiveAfter = yearPopover.querySelector('.calendar-picker-option.active')?.innerText || '';
          const yearMetrics = {
            width: yearPopover.offsetWidth,
            height: yearPopover.offsetHeight,
            optionCount: yearPopover.querySelectorAll('.calendar-picker-option').length,
            hasScrollbar: !!yearPopover.querySelector('.calendar-picker-scrollbar span'),
            scrollHeight: yearPopover.scrollHeight,
            clientHeight: yearPopover.clientHeight
          };
          document.body.click();
          await wait(120);

          document.querySelector('[data-view="customer-map"]')?.click();
          await wait(1200);
          const hasSouthSea = !!document.querySelector('.south-sea-map');
          state.map.selectedProvince = '山东';
          renderCustomerMap();
          await wait(600);
          const backButton = document.querySelector('#map-back-china');
          const backStyle = getComputedStyle(backButton);

          renderMapCustomerPopover('山东 · 青岛', [{
            id: 'verify-map-popup',
            name: '验证客户',
            industry: '测试行业',
            mapProvince: '山东',
            mapCity: '青岛',
            status: 'active',
            last_visit_at: '2026-07-01T00:00:00.000Z'
          }], { offsetX: 20, offsetY: 20 });
          await wait(100);
          const popup = document.querySelector('.map-floating-list');
          const header = popup.querySelector('.map-floating-header');
          const beforeDrag = popup.getBoundingClientRect();
          header.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: beforeDrag.left + 10, clientY: beforeDrag.top + 10, bubbles: true }));
          window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: -2000, clientY: -2000, bubbles: true }));
          window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: -2000, clientY: -2000, bubbles: true }));
          await wait(100);
          const canvasRect = document.querySelector('#customer-map-canvas').getBoundingClientRect();
          const afterDrag = popup.getBoundingClientRect();

          return {
            monthBefore,
            monthAfter,
            monthActiveAfter,
            monthMetrics,
            yearBefore,
            yearAfter,
            yearActiveAfter,
            yearMetrics,
            hasSouthSea,
            backButton: {
              hidden: backButton.hidden,
              text: backButton.innerText,
              color: backStyle.color
            },
            popup: {
              exists: !!popup,
              leftInside: afterDrag.left >= canvasRect.left,
              topInside: afterDrag.top >= canvasRect.top,
              rightInside: afterDrag.right <= canvasRect.right,
              bottomInside: afterDrag.bottom <= canvasRect.bottom
            }
          };
        })()
      `
    });

    const value = result.result.value;
    console.log(JSON.stringify(value, null, 2));

    if (
      value.monthMetrics.optionCount !== 4 ||
      !value.monthMetrics.hasScrollbar ||
      value.monthMetrics.scrollHeight > value.monthMetrics.clientHeight ||
      value.yearMetrics.optionCount !== 4 ||
      !value.yearMetrics.hasScrollbar ||
      value.yearMetrics.scrollHeight > value.yearMetrics.clientHeight ||
      value.monthBefore.join('|') === value.monthAfter.join('|') ||
      value.yearBefore.join('|') === value.yearAfter.join('|') ||
      value.hasSouthSea ||
      value.backButton.hidden ||
      value.backButton.text !== '↩' ||
      !value.popup.exists ||
      !value.popup.leftInside ||
      !value.popup.topInside ||
      !value.popup.rightInside ||
      !value.popup.bottomInside
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
