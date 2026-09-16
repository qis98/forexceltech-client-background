const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const defaultSqliteBin = 'D:\\DevTools\\SQLite\\sqlite3.exe';
const defaultDataDir = 'D:\\FOREXCELTECHClientManager';
const sqliteBin = process.env.FOREXCELTECH_SQLITE_BIN || (fs.existsSync(defaultSqliteBin) ? defaultSqliteBin : 'sqlite3');
const tempRoot = path.join(process.env.FOREXCELTECH_DATA_DIR || defaultDataDir, 'temp');
fs.mkdirSync(tempRoot, { recursive: true });
const tempDir = fs.mkdtempSync(path.join(tempRoot, 'db-verify-'));
const dbPath = path.join(tempDir, 'verify.db');
const schemaPath = path.join(__dirname, '..', 'src', 'database', 'migrations', '001_initial_schema.sql');
const expectedTables = [
  'attachments',
  'contacts',
  'customers',
  'import_export_logs',
  'opportunities',
  'todos',
  'visit_participants',
  'visits'
];

function runSqlite(input) {
  const result = spawnSync(sqliteBin, [dbPath], {
    input,
    encoding: 'utf8',
    windowsHide: true
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(result.stderr || `sqlite3 exited with code ${result.status}`);
  }

  return result.stdout.trim();
}

try {
  runSqlite(fs.readFileSync(schemaPath, 'utf8'));
  const tableOutput = runSqlite("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;");
  const actualTables = tableOutput.split(/\r?\n/).filter(Boolean);
  const missingTables = expectedTables.filter((tableName) => !actualTables.includes(tableName));
  const userVersion = runSqlite('PRAGMA user_version;');

  if (missingTables.length > 0) {
    throw new Error(`Missing tables: ${missingTables.join(', ')}`);
  }

  if (userVersion !== '1') {
    throw new Error(`Unexpected schema version: ${userVersion}`);
  }

  console.log(`SQLite binary: ${sqliteBin}`);
  console.log(`Temporary database: ${dbPath}`);
  console.log(`Schema version: ${userVersion}`);
  console.log(`Tables verified: ${actualTables.join(', ')}`);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
