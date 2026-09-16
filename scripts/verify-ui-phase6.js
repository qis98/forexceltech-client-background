const { spawn } = require('node:child_process');

const electron = 'D:/Codex/Test/ClientBackground/node_modules/electron/dist/electron.exe';
const child = spawn(electron, ['.', '--remote-debugging-port=9451'], {
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
      const response = await fetch('http://127.0.0.1:9451/json');
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
          const toastStates = [];
          showToast('成功提示');
          await new Promise((resolve) => setTimeout(resolve, 100));
          toastStates.push({
            type: 'success',
            classes: Array.from(document.querySelector('#toast').classList),
            color: getComputedStyle(document.querySelector('#toast')).color,
            background: getComputedStyle(document.querySelector('#toast')).backgroundColor
          });
          showToast('警告提示', 'warning');
          await new Promise((resolve) => setTimeout(resolve, 100));
          toastStates.push({
            type: 'warning',
            classes: Array.from(document.querySelector('#toast').classList),
            color: getComputedStyle(document.querySelector('#toast')).color,
            background: getComputedStyle(document.querySelector('#toast')).backgroundColor
          });
          showToast('错误提示', true);
          await new Promise((resolve) => setTimeout(resolve, 100));
          toastStates.push({
            type: 'error',
            classes: Array.from(document.querySelector('#toast').classList),
            color: getComputedStyle(document.querySelector('#toast')).color,
            background: getComputedStyle(document.querySelector('#toast')).backgroundColor
          });

          document.querySelector('#calendar-year-picker')?.click();
          await new Promise((resolve) => setTimeout(resolve, 150));
          const calendarPopover = document.querySelector('.calendar-picker-popover');

          openCustomerDialog({ name: '浮层验证客户', importance_level: 3 });
          await new Promise((resolve) => setTimeout(resolve, 250));
          document.querySelector('#province-trigger')?.click();
          await new Promise((resolve) => setTimeout(resolve, 150));
          const locationPanel = document.querySelector('[data-location-panel="province"]');
          closeDialog();
          await new Promise((resolve) => setTimeout(resolve, 150));

          await switchView('customer-map');
          await new Promise((resolve) => setTimeout(resolve, 900));
          renderMapCustomerPopover('上海 · 验证', (state.map.customers || state.customers || []).slice(0, 3), { offsetX: 420, offsetY: 140 });
          await new Promise((resolve) => setTimeout(resolve, 150));
          const mapFloating = document.querySelector('.map-floating-list');

          state.aiDraftResult = {
            source_label: '验证抽取',
            transcript_length: 168,
            draft_path: 'D:\\\\FOREXCELTECHClientManager\\\\ai-drafts\\\\verify.json',
            matched_customer: null,
            customer_candidates: [],
            drafts: [
              {
                type: 'customer',
                draft_id: 'customer',
                title: '客户草稿',
                confidence: 'medium',
                validation_errors: [],
                fields: [
                  { key: 'name', label: '客户名称', value: '验证客户', required: true, missing: false, confidence: 'high' },
                  { key: 'industry', label: '行业', value: '精密制造', required: false, missing: false, confidence: 'medium' },
                  { key: 'background', label: '客户背景', value: '这是较长背景，用于验证展开后字段区内部滚动。', required: false, missing: false, confidence: 'medium' }
                ]
              },
              {
                type: 'visit',
                draft_id: 'visit',
                title: '拜访记录草稿',
                confidence: 'medium',
                validation_errors: [],
                fields: [
                  { key: 'subject', label: '主题', value: '产线升级沟通', required: true, missing: false, confidence: 'high' },
                  { key: 'summary', label: '摘要', value: '讨论设备选型、交期和售后响应。', required: false, missing: false, confidence: 'medium' },
                  { key: 'next_action', label: '下一步', value: '发送技术方案和报价。', required: false, missing: false, confidence: 'medium' }
                ]
              }
            ]
          };
          state.aiBaseDraftResult = JSON.parse(JSON.stringify(state.aiDraftResult));
          state.aiConfirmed = { customerId: '', contactIds: {}, visitId: '' };
          state.aiCustomerDecision = { mode: 'new', customerId: '' };
          showAiDraftProgress();
          await new Promise((resolve) => setTimeout(resolve, 100));
          const progressCard = document.querySelector('.ai-progress-card');
          const progressBar = document.querySelector('.ai-progress-bar');
          const progressBarHeight = progressBar ? getComputedStyle(progressBar).height : '';
          renderAiDrafts();
          await new Promise((resolve) => setTimeout(resolve, 100));
          const summaryStripCount = document.querySelectorAll('.ai-summary-strip').length;
          const metaText = document.querySelector('#ai-result-meta')?.textContent || '';
          const headerTitle = document.querySelector('.ai-result-panel .panel-header h2');
          const headerTitleWhiteSpace = headerTitle ? getComputedStyle(headerTitle).whiteSpace : '';
          const mainFieldCount = document.querySelectorAll('#ai-draft-results [data-ai-field]').length;
          const taskCount = document.querySelectorAll('.ai-draft-task').length;
          document.querySelector('.ai-draft-card [data-action="edit-ai-draft"]')?.click();
          await new Promise((resolve) => setTimeout(resolve, 100));
          const editDialogOpen = document.querySelector('#detail-dialog')?.open || false;
          const editFieldGrid = document.querySelector('.ai-edit-field-grid');
          const editFieldCount = document.querySelectorAll('#detail-dialog [data-ai-field]').length;
          document.querySelector('#detail-dialog [data-action="save-ai-draft"]')?.click();
          await new Promise((resolve) => setTimeout(resolve, 100));
          document.querySelector('#ai-linked-customer-trigger')?.click();
          await new Promise((resolve) => setTimeout(resolve, 100));
          const pickerOpen = document.querySelector('#detail-dialog')?.open || false;
          const pickerSearch = !!document.querySelector('#ai-picker-search');
          const pickerItems = document.querySelectorAll('.ai-picker-item').length;
          const pickerPagination = !!document.querySelector('.ai-picker-pagination');
          const selectOptionCount = document.querySelectorAll('#ai-linked-customer option, #ai-linked-contact option').length;
          closeDetailDialog();

          const readOverlay = (el) => el ? {
            radius: getComputedStyle(el).borderRadius,
            shadow: getComputedStyle(el).boxShadow,
            overflow: getComputedStyle(el).overflow
          } : null;

          return {
            toastStates,
            overlays: {
              calendar: readOverlay(calendarPopover),
              location: readOverlay(locationPanel),
              map: readOverlay(mapFloating)
            },
            aiDraft: {
              toolbar: !!document.querySelector('.ai-draft-toolbar'),
              progressCard: !!progressCard,
              progressBarHeight,
              summaryStripCount,
              metaText,
              headerTitleWhiteSpace,
              mainFieldCount,
              taskCount,
              editDialogOpen,
              editFieldCount,
              editGridColumns: getComputedStyle(editFieldGrid).gridTemplateColumns,
              pickerOpen,
              pickerSearch,
              pickerItems,
              pickerPagination,
              selectOptionCount
            }
          };
        })()
      `
    });

    const value = result.result.value;
    console.log(JSON.stringify(value, null, 2));

    const toastOk = value.toastStates?.length === 3 &&
      value.toastStates[0].classes.includes('success') &&
      value.toastStates[1].classes.includes('warning') &&
      value.toastStates[2].classes.includes('error');
    const overlaysOk = value.overlays?.calendar?.radius === '8px' &&
      value.overlays?.location?.radius === '8px' &&
      value.overlays?.map?.radius === '8px' &&
      value.overlays.calendar.shadow !== 'none' &&
      value.overlays.location.shadow !== 'none' &&
      value.overlays.map.shadow !== 'none';
    const draftOk = !value.aiDraft?.toolbar &&
      value.aiDraft?.progressCard &&
      value.aiDraft?.progressBarHeight === '8px' &&
      value.aiDraft?.summaryStripCount === 0 &&
      !value.aiDraft?.metaText.includes('qwen') &&
      !value.aiDraft?.metaText.includes('draft-') &&
      value.aiDraft?.headerTitleWhiteSpace === 'nowrap' &&
      value.aiDraft?.mainFieldCount === 0 &&
      value.aiDraft?.taskCount === 2 &&
      value.aiDraft?.editDialogOpen &&
      value.aiDraft?.editFieldCount >= 3 &&
      value.aiDraft?.editGridColumns !== 'none' &&
      value.aiDraft?.pickerOpen &&
      value.aiDraft?.pickerSearch &&
      value.aiDraft?.pickerPagination &&
      value.aiDraft?.selectOptionCount === 0;

    if (!toastOk || !overlaysOk || !draftOk) {
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
