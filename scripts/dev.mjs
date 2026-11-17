import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const localPython = process.platform === 'win32'
  ? join('.venv', 'Scripts', 'python.exe')
  : join('.venv', 'bin', 'python');
const python = process.env.PYTHON || (existsSync(localPython) ? localPython : 'python');
const commands = [
  { command: process.execPath, args: ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0', '--port', '3000'] },
  { command: python, args: ['-m', 'uvicorn', 'backend.main:app', '--reload', '--host', '0.0.0.0', '--port', '8000'] },
];

const children = commands.map(({ command, args }) => spawn(command, args, { stdio: 'inherit', env: process.env }));
let stopping = false;
const stop = (code = 0) => {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
};

for (const child of children) {
  child.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on('exit', (code) => {
    if (!stopping && code !== 0) stop(code || 1);
  });
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
