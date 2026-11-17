import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const [moduleName, ...args] = process.argv.slice(2);
if (!moduleName) {
  console.error('Usage: node scripts/python-task.mjs <module> [args...]');
  process.exit(2);
}

const localPython = process.platform === 'win32'
  ? join('.venv', 'Scripts', 'python.exe')
  : join('.venv', 'bin', 'python');
const python = process.env.PYTHON || (existsSync(localPython) ? localPython : 'python');
const child = spawn(python, ['-m', moduleName, ...args], { stdio: 'inherit', env: process.env });
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
