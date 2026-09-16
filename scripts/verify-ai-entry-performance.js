const { spawn } = require('node:child_process');

const electron = 'D:/Codex/Test/ClientBackground/node_modules/electron/dist/electron.exe';
const port = 9452;
const child = spawn(electron, ['.', `--remote-debugging-port=${port}`], {
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
      const response = await fetch(`http://127.0.0.1:${port}/json`);
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
          await switchView('ai-entry');
          state.aiDraftResult = {
            source_label: '性能验证',
            transcript_length: 320,
            draft_path: 'D:\\\\FOREXCELTECHClientManager\\\\ai-drafts\\\\perf.json',
            matched_customer: null,
            customer_candidates: (state.aiCustomers || []).slice(0, 3).map((customer, index) => ({
              id: customer.id,
              name: customer.name,
              short_name: customer.short_name,
              score: 90 - index * 6,
              reason: '性能验证候选'
            })),
            drafts: [
              {
                type: 'customer',
                draft_id: 'customer',
                title: '客户草稿',
                confidence: 'medium',
                validation_errors: [],
                fields: [
                  { key: 'name', label: '客户名称', value: '性能验证客户', required: true, missing: false, confidence: 'high' },
                  { key: 'short_name', label: '客户简称', value: '性能验证', required: false, missing: false, confidence: 'medium' },
                  { key: 'industry', label: '行业', value: '精密制造', required: false, missing: false, confidence: 'medium' },
                  { key: 'background', label: '客户背景', value: '用于验证智能录入渲染性能的长文本字段。', required: false, missing: false, confidence: 'medium' }
                ]
              },
              ...[1, 2, 3].map((index) => ({
                type: 'contact',
                draft_id: 'contact-' + index,
                title: '联系人草稿 ' + index,
                confidence: 'medium',
                validation_errors: [],
                fields: [
                  { key: 'customer_name', label: '所属客户', value: '性能验证客户', required: true, missing: false, confidence: 'medium' },
                  { key: 'name', label: '姓名', value: '性能联系人-' + index, required: true, missing: false, confidence: 'high' },
                  { key: 'department', label: '部门', value: '设备部', required: false, missing: false, confidence: 'medium' },
                  { key: 'title', label: '职位', value: '经理', required: false, missing: false, confidence: 'medium' },
                  { key: 'notes', label: '备注', value: '关注交期、售后和技术方案。', required: false, missing: false, confidence: 'medium' }
                ]
              })),
              {
                type: 'visit',
                draft_id: 'visit',
                title: '拜访记录草稿',
                confidence: 'medium',
                validation_errors: [],
                fields: [
                  { key: 'customer_name', label: '客户', value: '性能验证客户', required: true, missing: false, confidence: 'medium' },
                  { key: 'subject', label: '主题', value: '产线升级沟通', required: true, missing: false, confidence: 'high' },
                  { key: 'summary', label: '摘要', value: '讨论设备选型、商务条件、交期和售后响应。', required: false, missing: false, confidence: 'medium' },
                  { key: 'next_action', label: '下一步', value: '发送技术方案和报价。', required: false, missing: false, confidence: 'medium' }
                ]
              }
            ]
          };
          state.aiBaseDraftResult = JSON.parse(JSON.stringify(state.aiDraftResult));
          state.aiConfirmed = { customerId: '', contactIds: {}, visitId: '' };
          state.aiCustomerDecision = { mode: state.aiDraftResult.customer_candidates.length ? '' : 'new', customerId: '' };

          const renderStart = performance.now();
          renderAiDrafts();
          const renderMs = performance.now() - renderStart;
          await new Promise((resolve) => setTimeout(resolve, 100));

          const aiDomNodes = document.querySelectorAll('#ai-entry-view *').length;
          const mainFieldCount = document.querySelectorAll('#ai-draft-results [data-ai-field]').length;
          const nativeOptionCount = document.querySelectorAll('#ai-linked-customer option, #ai-linked-contact option').length;
          const draftCardCount = document.querySelectorAll('.ai-draft-task').length;

          document.querySelector('#ai-linked-customer-trigger')?.click();
          await new Promise((resolve) => setTimeout(resolve, 100));
          const pickerItems = document.querySelectorAll('.ai-picker-item').length;
          const pickerHasPagination = !!document.querySelector('.ai-picker-pagination');
          const pickerDomNodes = document.querySelectorAll('#detail-dialog *').length;
          closeDetailDialog();

          document.querySelector('.ai-draft-task [data-action="edit-ai-draft"]')?.click();
          await new Promise((resolve) => setTimeout(resolve, 100));
          const editFieldCount = document.querySelectorAll('#detail-dialog [data-ai-field]').length;
          const editDomNodes = document.querySelectorAll('#detail-dialog *').length;
          closeDetailDialog();

          return {
            renderMs: Number(renderMs.toFixed(2)),
            aiDomNodes,
            mainFieldCount,
            nativeOptionCount,
            draftCardCount,
            pickerItems,
            pickerHasPagination,
            pickerDomNodes,
            editFieldCount,
            editDomNodes
          };
        })()
      `
    });

    const value = result.result.value;
    console.log(JSON.stringify(value, null, 2));

    const ok = value.renderMs < 250 &&
      value.aiDomNodes < 360 &&
      value.mainFieldCount === 0 &&
      value.nativeOptionCount === 0 &&
      value.draftCardCount === 5 &&
      value.pickerItems <= 10 &&
      value.pickerHasPagination &&
      value.editFieldCount >= 4;

    if (!ok) {
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
