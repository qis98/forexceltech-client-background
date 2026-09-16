const { spawn } = require('node:child_process');
const electronBin = require('electron');
const path = require('node:path');

const child = spawn(electronBin, ['.'], {
  cwd: path.join(__dirname, '..'),
  env: {
    ...process.env,
    FOREXCELTECH_SMOKE_TEST: '1'
  },
  shell: false,
  windowsHide: true
});

let output = '';
let errorOutput = '';

const timeout = setTimeout(() => {
  child.kill();
  console.error('Electron smoke test timed out.');
  process.exit(1);
}, 30000);

child.stdout.on('data', (chunk) => {
  output += chunk.toString();
});

child.stderr.on('data', (chunk) => {
  errorOutput += chunk.toString();
});

child.on('error', (error) => {
  clearTimeout(timeout);
  console.error(error.message);
  process.exit(1);
});

child.on('close', (code) => {
  clearTimeout(timeout);

  if (code !== 0) {
    console.error(errorOutput || `Electron exited with code ${code}`);
    process.exit(code || 1);
  }

  const lines = output.trim().split(/\r?\n/).filter(Boolean);
  const statusLine = lines.find((line) => line.startsWith('{') && line.endsWith('}'));

  if (!statusLine) {
    console.error('Electron smoke test did not return bootstrap status.');
    process.exit(1);
  }

  const status = JSON.parse(statusLine);
  if (!status.ok || status.tableCount < 8) {
    console.error(`Unexpected bootstrap status: ${statusLine}`);
    process.exit(1);
  }

  console.log(`Electron bootstrap verified: ${status.tableCount} tables at ${status.dbPath}`);
});
