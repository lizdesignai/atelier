const { spawn } = require('child_process');
const path = require('path');

const currentOptions = process.env.NODE_OPTIONS || '';
if (!currentOptions.includes('--max-old-space-size')) {
  process.env.NODE_OPTIONS = `${currentOptions} --max-old-space-size=8192`.trim();
}

console.log('[DevRunner] Starting Next.js with NODE_OPTIONS:', process.env.NODE_OPTIONS);

const port = process.env.PORT || '3001';
const nextBin = require.resolve('next/dist/bin/next');
const child = spawn(process.execPath, [nextBin, 'dev', '-p', port], {
  stdio: 'inherit',
  env: process.env,
  cwd: __dirname
});

child.on('exit', (code, signal) => {
  if (code !== null) {
    process.exit(code);
  } else if (signal) {
    process.kill(process.pid, signal);
  }
});

process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
