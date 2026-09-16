const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_DATA_DIR = 'D:\\FOREXCELTECHClientManager';
const DEFAULT_SQLITE_BIN = 'D:\\DevTools\\SQLite\\sqlite3.exe';

function resolveSqliteBin() {
  if (process.env.FOREXCELTECH_SQLITE_BIN) {
    return process.env.FOREXCELTECH_SQLITE_BIN;
  }

  const packagedSqliteBin = path.join(process.resourcesPath || '', 'sqlite', 'sqlite3.exe');
  if (fs.existsSync(packagedSqliteBin)) {
    return packagedSqliteBin;
  }

  if (fs.existsSync(DEFAULT_SQLITE_BIN)) {
    return DEFAULT_SQLITE_BIN;
  }

  return 'sqlite3';
}

function runSqlite(dbPath, input) {
  const sqliteBin = resolveSqliteBin();
  const result = spawnSync(sqliteBin, [dbPath], {
    input,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024
  });

  if (result.error) {
    throw new Error(`SQLite execution failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(result.stderr || `SQLite exited with code ${result.status}`);
  }

  return result.stdout;
}

function getRuntimePaths() {
  const baseDir = process.env.FOREXCELTECH_DATA_DIR || DEFAULT_DATA_DIR;
  return {
    baseDir,
    dbPath: path.join(baseDir, 'data.db'),
    attachmentsDir: path.join(baseDir, 'attachments'),
    audioImportsDir: path.join(baseDir, 'audio-imports'),
    transcriptsDir: path.join(baseDir, 'transcripts'),
    aiDraftsDir: path.join(baseDir, 'ai-drafts'),
    backupsDir: path.join(baseDir, 'backups'),
    exportsDir: path.join(baseDir, 'exports'),
    logsDir: path.join(baseDir, 'logs'),
    tempDir: path.join(baseDir, 'temp')
  };
}

function getMigrationSql() {
  const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '001_initial_schema.sql');
  return fs.readFileSync(migrationPath, 'utf8');
}

function ensureColumn(dbPath, tableName, columnName, definition) {
  const columns = runSqlite(dbPath, `PRAGMA table_info(${tableName});`)
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.split('|')[1]);

  if (!columns.includes(columnName)) {
    runSqlite(dbPath, `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};`);
  }
}

function ensureIncrementalMigrations(dbPath) {
  ensureColumn(dbPath, 'customers', 'province', 'TEXT');
  ensureColumn(dbPath, 'customers', 'city', 'TEXT');
  ensureColumn(dbPath, 'customers', 'district', 'TEXT');
  ensureColumn(dbPath, 'customers', 'main_products', 'TEXT');
  ensureColumn(dbPath, 'contacts', 'native_place', 'TEXT');
}

function initializeDatabase() {
  const paths = getRuntimePaths();

  fs.mkdirSync(paths.baseDir, { recursive: true });
  fs.mkdirSync(paths.attachmentsDir, { recursive: true });
  fs.mkdirSync(paths.audioImportsDir, { recursive: true });
  fs.mkdirSync(paths.transcriptsDir, { recursive: true });
  fs.mkdirSync(paths.aiDraftsDir, { recursive: true });
  fs.mkdirSync(paths.backupsDir, { recursive: true });
  fs.mkdirSync(paths.exportsDir, { recursive: true });
  fs.mkdirSync(paths.logsDir, { recursive: true });
  fs.mkdirSync(paths.tempDir, { recursive: true });

  runSqlite(paths.dbPath, getMigrationSql());
  ensureIncrementalMigrations(paths.dbPath);

  const integrityOutput = runSqlite(paths.dbPath, 'PRAGMA integrity_check;').trim();

  const tableOutput = runSqlite(
    paths.dbPath,
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;"
  );

  return {
    ...paths,
    sqliteBin: resolveSqliteBin(),
    tables: tableOutput.trim().split(/\r?\n/).filter(Boolean),
    integrity: integrityOutput === 'ok' ? 'ok' : integrityOutput
  };
}

module.exports = {
  initializeDatabase,
  resolveSqliteBin,
  runSqlite
};
