const { spawn } = require('node:child_process');

const electron = 'D:/Codex/Test/ClientBackground/node_modules/electron/dist/electron.exe';
const child = spawn(electron, ['.', '--remote-debugging-port=9449'], {
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
      const response = await fetch('http://127.0.0.1:9449/json');
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

async function evaluate(client, expression, awaitPromise = false) {
  const result = await client.call('Runtime.evaluate', { returnByValue: true, awaitPromise, expression });
  return result.result.value;
}

async function inspectForm(client, openExpression) {
  await client.call('Runtime.evaluate', {
    awaitPromise: true,
    expression: `
      (async () => {
        document.querySelector('#entity-dialog')?.close();
        ${openExpression}
        await new Promise((resolve) => setTimeout(resolve, 500));
      })()
    `
  });
  return evaluate(client, `(() => ({
    open: document.querySelector('#entity-dialog')?.open === true,
    title: document.querySelector('#dialog-title')?.innerText || '',
    sections: Array.from(document.querySelectorAll('#dialog-fields .form-section-head h3')).map((item) => item.innerText),
    descriptions: Array.from(document.querySelectorAll('#dialog-fields .form-section-head p')).map((item) => item.innerText),
    sectionCount: document.querySelectorAll('#dialog-fields .form-section').length,
    sectionGridCount: document.querySelectorAll('#dialog-fields .form-section-grid').length,
    addressField: !!document.querySelector('#address'),
    recognizeButton: !!document.querySelector('#recognize-address'),
    locationGrid: !!document.querySelector('.customer-location-grid'),
    provincePicker: !!document.querySelector('#province-trigger'),
    cityPicker: !!document.querySelector('#city-trigger'),
    checkboxGrid: !!document.querySelector('.checkbox-grid'),
    plannedDate: !!document.querySelector('#planned_date'),
    firstSectionColumns: getComputedStyle(document.querySelector('#dialog-fields .form-section-grid') || document.body).gridTemplateColumns,
    focusRulePresent: Array.from(document.styleSheets)
      .flatMap((sheet) => {
        try { return Array.from(sheet.cssRules || []); } catch { return []; }
      })
      .some((rule) => String(rule.selectorText || '').includes('.field input:focus'))
  }))()`);
}

async function main() {
  let client;
  try {
    client = await createCdpClient(await waitForTarget());
    await client.call('Runtime.enable');
    await wait(2500);

    const customer = await inspectForm(client, 'openCustomerDialog({ name: "验证客户", importance_level: 3 });');
    const contact = await inspectForm(client, 'openContactDialog({ customer_id: state.customers?.[0]?.id || 1, name: "验证联系人" });');
    const visit = await inspectForm(client, 'openVisitDialog({ customer_id: state.customers?.[0]?.id || 1, subject: "验证拜访", occurred_at: new Date().toISOString() }, state.selectedBundle?.contacts || []);');
    const plan = await inspectForm(client, 'await openVisitPlanDialog({ planned_date: "2026-07-04", purpose: "验证计划" });');

    const result = { customer, contact, visit, plan };
    console.log(JSON.stringify(result, null, 2));

    const hasSections = (value, titles) => value.open &&
      value.sectionCount === titles.length &&
      value.sectionGridCount === titles.length &&
      titles.every((title) => value.sections.includes(title)) &&
      value.focusRulePresent;

    if (
      !hasSections(customer, ['基础信息', '地址与区域', '业务信息', '背景备注']) ||
      !customer.addressField ||
      !customer.recognizeButton ||
      !customer.locationGrid ||
      !customer.provincePicker ||
      !customer.cityPicker ||
      !hasSections(contact, ['基础信息', '职务与联系方式', '关系与偏好', '背景备注']) ||
      !hasSections(visit, ['基础信息', '参与联系人', '沟通内容', '后续动作']) ||
      !visit.checkboxGrid ||
      !hasSections(plan, ['拜访对象', '时间与优先级', '目的备注']) ||
      !plan.plannedDate
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
