const fs = require('node:fs');
const { initializeDatabase } = require('../src/main/database');
const { createRepository } = require('../src/main/repository');
const { backupDatabase, exportCsvFiles } = require('../src/main/data-actions');

const databaseStatus = initializeDatabase();
const repository = createRepository(databaseStatus.dbPath);

const backup = backupDatabase(databaseStatus);
if (!fs.existsSync(backup.path)) {
  throw new Error(`Backup was not created: ${backup.path}`);
}

const exported = exportCsvFiles(databaseStatus, repository);
for (const filePath of exported.files) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Export file was not created: ${filePath}`);
  }
}

console.log(`Backup verified: ${backup.path}`);
console.log(`CSV export verified: ${exported.dir}`);
