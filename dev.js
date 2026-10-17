import { spawn, execSync } from 'child_process';
import { setTimeout } from 'timers/promises';

// Pre-flight check: Release ports 5000 and 3000 if occupied by stale processes
try {
  execSync('fuser -k 5000/tcp 3000/tcp 2>/dev/null || true', { stdio: 'ignore' });
} catch {
  // Ignore
}

console.log('Starting Server...');
console.log('Starting backend server on port 5000...');
const backendProcess = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: 'development',
    PORT: '5000',
    USE_DATABASE: 'true',
    NODE_OPTIONS: '--max-old-space-size=4096'
  },
});
await setTimeout(3000);

console.log(' Starting frontend server...');
const viteProcess = spawn('npx', ['vite'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_OPTIONS: '--max-old-space-size=4096'
  }
});

const cleanup = () => {
  console.log('\n Shutting down servers...');
  backendProcess.kill('SIGTERM');
  viteProcess.kill('SIGTERM');
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

viteProcess.on('close', (code) => {
  console.log(`Vite exited with code ${code}`);
  backendProcess.kill('SIGTERM');
  process.exit(code);
});

backendProcess.on('close', (code) => {
  console.log(`Backend exited with code ${code}`);
  viteProcess.kill('SIGTERM');
  process.exit(code);
});

backendProcess.on('error', (error) => {
  console.error('Backend process error:', error);
  cleanup();
});

viteProcess.on('error', (error) => {
  console.error('Vite process error:', error);
  cleanup();
});