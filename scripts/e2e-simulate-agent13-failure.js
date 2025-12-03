#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd) {
  console.log('> ' + cmd);
  return execSync(cmd, { stdio: 'inherit' });
}

async function main() {
  const cwd = process.cwd();
  // First run: force agent-13 to fail via env var
  console.log('--- Running with forced agent-13 failure (simulate) ---');
  process.env.FORCE_AGENT_13_FAILURE = '1';
  try {
    run('node scripts/run-all-agents.js');
  } catch (e) {
    console.warn('First run completed with expected failures');
  }

  // Read state and show agent-13 status
  const state = JSON.parse(fs.readFileSync(path.join(cwd,'state','runner-state.json'),'utf8'));
  const a13 = state.results.find(r=>r.agent==='agent-13');
  console.log('agent-13 after forced failure:', a13 && a13.status, a13 && a13.content);

  // Now clear the force and run again (simulate fix/correction)
  console.log('--- Re-running after clearing forced failure ---');
  delete process.env.FORCE_AGENT_13_FAILURE;
  run('node scripts/run-all-agents.js');

  const state2 = JSON.parse(fs.readFileSync(path.join(cwd,'state','runner-state.json'),'utf8'));
  const a13b = state2.results.find(r=>r.agent==='agent-13');
  console.log('agent-13 after retry:', a13b && a13b.status, a13b && a13b.content);
}

main().catch(e=>{ console.error(e); process.exit(1); });
