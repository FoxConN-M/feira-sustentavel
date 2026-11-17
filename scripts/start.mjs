import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const localPython = process.platform === 'win32'
  ? join('.venv', 'Scripts', 'python.exe')
  : join('.venv', 'bin', 'python');
const python = process.env.PYTHON || (existsSync(localPython) ? localPython : 'python');
const child = spawn(
  python,
  ['-m', 'uvicorn', 'backend.main:app', '--host', '0.0.0.0', '--port', '8000'],
  { stdio: 'inherit', env: { ...process.env, APP_ENV: process.env.APP_ENV || 'development' } },
);
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
