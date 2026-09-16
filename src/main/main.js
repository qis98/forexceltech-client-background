const path = require('node:path');
const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const { initializeDatabase } = require('./database');
const { createRepository } = require('./repository');
const { backupDatabase, exportCsvFiles, restoreDatabaseFromBackup } = require('./data-actions');
const { exportCustomerDossiers } = require('./customer-dossier');
const { selectAudioFile, transcribeAudio, extractDraftsFromTranscript } = require('./ai-actions');
const { getEffectiveAiConfig, getPublicConfig, saveAppConfig } = require('./app-config');

let mainWindow;
let databaseStatus;
let repository;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    title: 'FOREXCELTECH 客户背景管理系统',
    backgroundColor: '#f5f7fb',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
}

function createAppMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        { label: '新增客户', accelerator: 'CmdOrCtrl+N', click: () => sendNavigate('customers:new') },
        { type: 'separator' },
        { label: '退出', role: 'quit' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', role: 'reload' },
        { label: '强制重新加载', role: 'forceReload' },
        { type: 'separator' },
        { label: '放大', role: 'zoomIn' },
        { label: '缩小', role: 'zoomOut' },
        { label: '实际大小', role: 'resetZoom' },
        { type: 'separator' },
        { label: '全屏', role: 'togglefullscreen' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', role: 'minimize' },
        { label: '关闭', role: 'close' }
      ]
    },
    {
      label: '设置',
      submenu: [
        { label: '打开设置', accelerator: 'CmdOrCtrl+,', click: () => sendNavigate('settings') }
      ]
    },
    {
      label: '帮助',
      submenu: [
        { label: '关于', click: () => sendNavigate('about') }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function sendNavigate(view) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  mainWindow.webContents.send('menu:navigate', view);
}

app.whenReady().then(() => {
  databaseStatus = initializeDatabase();
  repository = createRepository(databaseStatus.dbPath);

  if (process.env.FOREXCELTECH_SMOKE_TEST === '1') {
    console.log(JSON.stringify({
      ok: true,
      dbPath: databaseStatus.dbPath,
      attachmentsDir: databaseStatus.attachmentsDir,
      tableCount: databaseStatus.tables.length
    }));
    app.quit();
    return;
  }

  createMainWindow();
  createAppMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('app:get-bootstrap-status', () => {
  return {
    appName: app.getName(),
    appVersion: app.getVersion(),
    database: databaseStatus
  };
});

ipcMain.handle('dashboard:get', () => repository.getDashboard());
ipcMain.handle('customers:list', (_event, search) => repository.listCustomers(search || ''));
ipcMain.handle('customers:get', (_event, customerId) => repository.getCustomerBundle(customerId));
ipcMain.handle('customers:save', (_event, payload) => repository.saveCustomer(payload));
ipcMain.handle('customers:delete', (_event, customerId) => repository.deleteCustomer(customerId));
ipcMain.handle('contacts:list', (_event, search) => repository.listContacts(search || ''));
ipcMain.handle('contacts:save', (_event, payload) => repository.saveContact(payload));
ipcMain.handle('contacts:delete', (_event, contactId) => repository.deleteContact(contactId));
ipcMain.handle('visits:list', (_event, search) => repository.listVisits(search || ''));
ipcMain.handle('visits:save', (_event, payload) => repository.saveVisit(payload));
ipcMain.handle('visits:delete', (_event, visitId) => repository.deleteVisit(visitId));
ipcMain.handle('calendar:get-month-summary', (_event, payload) => repository.getCalendarMonthSummary(payload?.year, payload?.month));
ipcMain.handle('calendar:get-day-detail', (_event, date) => repository.getCalendarDayDetail(date));
ipcMain.handle('visit-plans:save', (_event, payload) => repository.saveVisitPlan(payload || {}));
ipcMain.handle('visit-plans:cancel', (_event, planId) => repository.cancelVisitPlan(planId));
ipcMain.handle('visit-plans:complete', (_event, payload) => repository.completeVisitPlan(payload?.planId, payload?.visitId));
ipcMain.handle('customers:filter-options', () => repository.getCustomerFilterOptions());
ipcMain.handle('data:backup', () => backupDatabase(databaseStatus));
ipcMain.handle('data:export-csv', () => exportCsvFiles(databaseStatus, repository));
ipcMain.handle('data:restore-backup', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择要恢复的备份数据库',
    defaultPath: databaseStatus.backupsDir,
    properties: ['openFile'],
    filters: [
      { name: 'SQLite 数据库', extensions: ['db', 'sqlite', 'sqlite3'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  });
  if (result.canceled || !result.filePaths.length) {
    return { ok: false, canceled: true };
  }
  const restored = restoreDatabaseFromBackup(databaseStatus, result.filePaths[0]);
  databaseStatus = initializeDatabase();
  repository = createRepository(databaseStatus.dbPath);
  return restored;
});
ipcMain.handle('data:export-customer-dossiers', async (_event, payload = {}) => {
  const dirResult = await dialog.showOpenDialog(mainWindow, {
    title: '选择客户档案批量导出目录',
    defaultPath: databaseStatus.exportsDir,
    properties: ['openDirectory', 'createDirectory']
  });
  if (dirResult.canceled || !dirResult.filePaths.length) {
    return { ok: false, canceled: true };
  }
  return exportCustomerDossiers(databaseStatus, repository, {
    ...payload,
    outputDir: dirResult.filePaths[0]
  });
});
ipcMain.handle('ai:select-audio', () => selectAudioFile(databaseStatus));
ipcMain.handle('ai:transcribe-audio', (_event, audioPath) => transcribeAudio(databaseStatus, audioPath));
ipcMain.handle('ai:extract-drafts', (_event, transcript) => extractDraftsFromTranscript(databaseStatus, repository, transcript));
ipcMain.handle('settings:get', () => getPublicConfig(databaseStatus));
ipcMain.handle('settings:save', (_event, payload) => saveAppConfig(databaseStatus, payload || {}));
ipcMain.handle('settings:test-ai', async () => testAiConnection());

async function testAiConnection() {
  const aiConfig = getEffectiveAiConfig(databaseStatus);
  if (aiConfig.aiMode !== 'ollama') {
    throw new Error('当前为仅本地规则模式，请先切换为 Ollama 本地模型。');
  }

  let response;
  try {
    response = await fetch(`${aiConfig.ollamaBaseUrl}/api/tags`, { method: 'GET' });
  } catch {
    throw new Error(`无法连接 Ollama 服务 ${aiConfig.ollamaBaseUrl}。请确认 Ollama 已启动。`);
  }
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    throw new Error(payload.error?.message || payload.message || `HTTP ${response.status}`);
  }
  const models = Array.isArray(payload.models) ? payload.models : [];
  const hasModel = models.some((model) => model.name === aiConfig.ollamaModel || model.model === aiConfig.ollamaModel);
  if (!hasModel) {
    throw new Error(`Ollama 已连接，但未找到模型 ${aiConfig.ollamaModel}。请先执行：ollama pull ${aiConfig.ollamaModel}`);
  }
  return {
    ok: true,
    baseUrl: aiConfig.ollamaBaseUrl,
    model: aiConfig.ollamaModel,
    modelCount: models.length
  };
}
