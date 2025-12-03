#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const l of lines) {
    const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) {
      const key = m[1];
      let val = m[2] || '';
      // strip surrounding quotes
      if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

async function main() {
  const cwd = process.cwd();
  const envPath = path.join(cwd, '.env');
  if (fs.existsSync(envPath)) {
    console.log('Loading .env');
    loadEnvFile(envPath);
  }

  // Print presence of OPENROUTER_API_KEY (do not print the key itself)
  const present = !!process.env.OPENROUTER_API_KEY;
  console.log('OPENROUTER_API_KEY:', present ? 'set' : 'not set');
  console.log('OPENROUTER_API_URL:', process.env.OPENROUTER_API_URL || '(default)');

  // Run a quick network connectivity test using PowerShell Test-NetConnection when on Windows
  try {
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      console.log('Running PowerShell Test-NetConnection to api.openrouter.ai:443');
      const { execSync } = require('child_process');
      try {
        const out = execSync('powershell -Command "Test-NetConnection -ComputerName api.openrouter.ai -Port 443 | Select-Object -Property TcpTestSucceeded,RemoteAddress,RoundTripTime | ConvertTo-Json"', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
        console.log('Network test result:', out.trim());
      } catch (e) {
        console.warn('Network test failed to run:', e && e.message);
      }
    } else {
      // On non-Windows, use curl to check
      console.log('Running curl connectivity check to api.openrouter.ai:443');
      const { execSync } = require('child_process');
      try {
        const out = execSync('curl -I --max-time 5 https://api.openrouter.ai/', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
        console.log('curl result (headers):\n', out.split('\n').slice(0,10).join('\n'));
      } catch (e) {
        console.warn('curl connectivity check failed:', e && e.message);
      }
    }
  } catch (e) {
    console.warn('Connectivity checks not available in this environment:', e && e.message);
  }

  // Now invoke the existing runner
  console.log('\nInvoking runner with ENABLE_LLM=', process.env.ENABLE_LLM || 'not set');
  const { spawn } = require('child_process');
  const runner = spawn(process.execPath, [path.join(__dirname, 'run-all-agents.js')], { stdio: 'inherit', env: process.env });
  runner.on('exit', (code) => {
    console.log('Runner exited with code', code);
    process.exit(code);
  });
}

main().catch(e => {
  console.error('Diagnostics runner failed:', e && e.stack ? e.stack : e);
  process.exit(1);
});
