const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('forexceltechApp', {
  getBootstrapStatus: () => ipcRenderer.invoke('app:get-bootstrap-status'),
  getDashboard: () => ipcRenderer.invoke('dashboard:get'),
  listCustomers: (filters) => ipcRenderer.invoke('customers:list', filters),
  getCustomerFilterOptions: () => ipcRenderer.invoke('customers:filter-options'),
  getCustomer: (customerId) => ipcRenderer.invoke('customers:get', customerId),
  saveCustomer: (payload) => ipcRenderer.invoke('customers:save', payload),
  deleteCustomer: (customerId) => ipcRenderer.invoke('customers:delete', customerId),
  listContacts: (search) => ipcRenderer.invoke('contacts:list', search),
  saveContact: (payload) => ipcRenderer.invoke('contacts:save', payload),
  deleteContact: (contactId) => ipcRenderer.invoke('contacts:delete', contactId),
  listVisits: (search) => ipcRenderer.invoke('visits:list', search),
  saveVisit: (payload) => ipcRenderer.invoke('visits:save', payload),
  deleteVisit: (visitId) => ipcRenderer.invoke('visits:delete', visitId),
  getCalendarMonthSummary: (payload) => ipcRenderer.invoke('calendar:get-month-summary', payload),
  getCalendarDayDetail: (date) => ipcRenderer.invoke('calendar:get-day-detail', date),
  saveVisitPlan: (payload) => ipcRenderer.invoke('visit-plans:save', payload),
  cancelVisitPlan: (planId) => ipcRenderer.invoke('visit-plans:cancel', planId),
  completeVisitPlan: (payload) => ipcRenderer.invoke('visit-plans:complete', payload),
  backupData: () => ipcRenderer.invoke('data:backup'),
  exportCsv: () => ipcRenderer.invoke('data:export-csv'),
  restoreBackup: () => ipcRenderer.invoke('data:restore-backup'),
  exportCustomerDossiers: (payload) => ipcRenderer.invoke('data:export-customer-dossiers', payload),
  selectAudioFile: () => ipcRenderer.invoke('ai:select-audio'),
  transcribeAudio: (audioPath) => ipcRenderer.invoke('ai:transcribe-audio', audioPath),
  extractAiDrafts: (transcript) => ipcRenderer.invoke('ai:extract-drafts', transcript),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (payload) => ipcRenderer.invoke('settings:save', payload),
  testAiConnection: () => ipcRenderer.invoke('settings:test-ai'),
  onMenuNavigate: (callback) => {
    const handler = (_event, view) => callback(view);
    ipcRenderer.on('menu:navigate', handler);
    return () => ipcRenderer.removeListener('menu:navigate', handler);
  }
});
