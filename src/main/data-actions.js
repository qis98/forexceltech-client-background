const fs = require('node:fs');
const path = require('node:path');
const { runSqlite } = require('./database');

function timestampForFile() {
  return new Date().toISOString().replaceAll(':', '').replaceAll('.', '-');
}

function backupDatabase(databaseStatus) {
  fs.mkdirSync(databaseStatus.backupsDir, { recursive: true });
  const backupPath = path.join(databaseStatus.backupsDir, `data-${timestampForFile()}.db`);
  fs.copyFileSync(databaseStatus.dbPath, backupPath);
  return {
    ok: true,
    path: backupPath
  };
}

function exportCsvFiles(databaseStatus, repository) {
  fs.mkdirSync(databaseStatus.exportsDir, { recursive: true });
  const exportDir = path.join(databaseStatus.exportsDir, `export-${timestampForFile()}`);
  fs.mkdirSync(exportDir, { recursive: true });

  const files = [
    writeCsv(path.join(exportDir, 'customers.csv'), repository.listCustomersForExport()),
    writeCsv(path.join(exportDir, 'contacts.csv'), repository.listContactsForExport()),
    writeCsv(path.join(exportDir, 'visits.csv'), repository.listVisitsForExport())
  ];

  return {
    ok: true,
    dir: exportDir,
    files
  };
}

function restoreDatabaseFromBackup(databaseStatus, backupPath) {
  if (!backupPath || !fs.existsSync(backupPath)) {
    throw new Error('未选择有效的备份数据库文件。');
  }
  if (path.resolve(backupPath) === path.resolve(databaseStatus.dbPath)) {
    throw new Error('不能选择当前正在使用的数据库文件。');
  }

  validateBackupDatabase(backupPath);
  const currentBackup = backupDatabase(databaseStatus);
  fs.copyFileSync(backupPath, databaseStatus.dbPath);
  validateBackupDatabase(databaseStatus.dbPath);

  return {
    ok: true,
    restoredFrom: backupPath,
    currentBackupPath: currentBackup.path,
    dbPath: databaseStatus.dbPath
  };
}

function validateBackupDatabase(dbPath) {
  const integrity = runSqlite(dbPath, 'PRAGMA integrity_check;').trim();
  if (integrity !== 'ok') {
    throw new Error(`备份数据库完整性检查失败：${integrity}`);
  }
  const tables = runSqlite(dbPath, "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  const requiredTables = ['customers', 'contacts', 'visits', 'visit_participants'];
  const missing = requiredTables.filter((tableName) => !tables.includes(tableName));
  if (missing.length) {
    throw new Error(`备份数据库缺少必要数据表：${missing.join(', ')}`);
  }
}

function writeCsv(filePath, rows) {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(','))
  ];
  fs.writeFileSync(filePath, `\uFEFF${lines.join('\r\n')}`, 'utf8');
  return filePath;
}

function csvCell(value) {
  if (value === undefined || value === null) {
    return '';
  }
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

module.exports = {
  backupDatabase,
  exportCsvFiles,
  restoreDatabaseFromBackup,
  validateBackupDatabase
};
