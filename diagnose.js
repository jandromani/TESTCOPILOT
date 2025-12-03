#!/usr/bin/env node

/**
 * System Diagnostics Script
 * Inspecciona el estado completo del sistema de agentes.
 * 
 * Uso: node diagnose.js
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(level, msg) {
  const symbols = { info: 'ℹ️', warn: '⚠️', ok: '✅', error: '❌' };
  const colorMap = { info: colors.blue, warn: colors.yellow, ok: colors.green, error: colors.red };
  const color = colorMap[level] || colors.reset;
  console.log(`${color}${symbols[level] || '•'} ${msg}${colors.reset}`);
}

function heading(title) {
  console.log(`\n${colors.cyan}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}  ${title}${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════${colors.reset}\n`);
}

function section(title) {
  console.log(`\n${colors.cyan}▶ ${title}${colors.reset}`);
}

function readFileLines(filePath, maxLines = 10) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').slice(0, maxLines);
    return lines;
  } catch (e) {
    return [];
  }
}

function diagnoseAgents() {
  section('Agent Structure');
  const agentDir = path.join(__dirname, 'custom-agents');
  let count = 0;
  
  for (let i = 0; i <= 17; i++) {
    const agentPath = path.join(agentDir, `agent-${i}`);
    const agentMd = path.join(agentPath, `agent-${i}.agent.md`);
    
    if (fs.existsSync(agentPath)) {
      count++;
      const configPath = path.join(agentPath, `agent-${i}-config.md`);
      const actionsPath = path.join(agentPath, `agent-${i}-actions.js`);
      
      const hasAll = fs.existsSync(configPath) && fs.existsSync(actionsPath);
      const status = hasAll ? '✅' : '⚠️';
      
      log('ok', `${status} agent-${i}: Complete`);
    }
  }
  
  log('info', `Total agents: ${count}/18`);
}

function diagnoseModels() {
  section('Model Configuration');
  const modelsPath = path.join(__dirname, 'models-config.json');
  
  if (!fs.existsSync(modelsPath)) {
    log('error', 'models-config.json not found');
    return;
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));
    
    if (config.free_models) {
      log('ok', `Free models available: ${config.free_models.length}`);
      config.free_models.forEach((m, idx) => {
        log('info', `  [${idx}] ${m}`);
      });
    }
    
    if (config.agent_models) {
      const mappedCount = Object.keys(config.agent_models).length;
      log('ok', `Agents mapped: ${mappedCount}`);
    }
  } catch (e) {
    log('error', `Invalid JSON: ${e.message}`);
  }
}

function diagnoseEnvironment() {
  section('Environment Configuration');
  
  const envPath = '.env';
  const envExamplePath = '.env.example';
  
  if (fs.existsSync(envPath)) {
    log('ok', '.env exists');
    const content = fs.readFileSync(envPath, 'utf8');
    
    const hasKey = content.includes('OPENROUTER_API_KEY=');
    const hasValue = !content.match(/OPENROUTER_API_KEY=\s*$/m) && 
                     !content.match(/OPENROUTER_API_KEY=your-key/im);
    
    if (hasValue) {
      log('ok', 'OPENROUTER_API_KEY is configured');
    } else {
      log('warn', 'OPENROUTER_API_KEY is not set');
    }
    
    const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    log('info', `  Total vars configured: ${lines.length}`);
  } else {
    log('warn', '.env not found');
    if (fs.existsSync(envExamplePath)) {
      log('info', 'You can create .env by running: cp .env.example .env');
    }
  }
}

function diagnoseShared() {
  section('Shared Utilities');
  const sharedDir = path.join(__dirname, 'shared');
  
  const files = [
    'openrouter.js',
    'retries.js',
    'utils.js',
    'common-tools.json',
    'shared-config.json'
  ];
  
  let count = 0;
  for (const file of files) {
    const filePath = path.join(sharedDir, file);
    if (fs.existsSync(filePath)) {
      log('ok', `${file}`);
      count++;
    } else {
      log('error', `${file} (missing)`);
    }
  }
  
  log('info', `Files present: ${count}/${files.length}`);
}

function diagnoseState() {
  section('State Directory');
  const stateDir = path.join(__dirname, 'state');
  
  if (!fs.existsSync(stateDir)) {
    log('warn', 'state/ directory does not exist (will be created on first run)');
    return;
  }
  
  const files = fs.readdirSync(stateDir);
  if (files.length === 0) {
    log('info', 'state/ directory is empty');
  } else {
    log('ok', `Files in state/: ${files.length}`);
    files.forEach(f => {
      const stat = fs.statSync(path.join(stateDir, f));
      const size = (stat.size / 1024).toFixed(2);
      log('info', `  ${f} (${size} KB)`);
    });
    
    // Check latest run
    const runState = path.join(stateDir, 'runner-state.json');
    if (fs.existsSync(runState)) {
      try {
        const state = JSON.parse(fs.readFileSync(runState, 'utf8'));
        log('ok', `Latest run ID: ${state.runId}`);
        log('info', `  Status: ${state.status}`);
        log('info', `  Agents completed: ${Object.keys(state.agents).length}`);
      } catch (e) {
        log('warn', 'Could not parse runner-state.json');
      }
    }
  }
}

function diagnosePackages() {
  section('Dependencies');
  const pkgPath = path.join(__dirname, 'package.json');
  
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    
    log('ok', `Total dependencies: ${Object.keys(allDeps).length}`);
    
    for (const [dep, version] of Object.entries(allDeps)) {
      log('info', `  ${dep}: ${version}`);
    }
  } catch (e) {
    log('error', `Could not read package.json: ${e.message}`);
  }
}

function diagnoseWorkflows() {
  section('GitHub Workflows');
  const workflowDir = path.join(__dirname, '.github', 'workflows');
  
  if (!fs.existsSync(workflowDir)) {
    log('warn', 'workflows directory not found');
    return;
  }
  
  const files = fs.readdirSync(workflowDir).filter(f => f.endsWith('.yml'));
  
  if (files.length === 0) {
    log('warn', 'No workflows found');
  } else {
    log('ok', `Workflows: ${files.length}`);
    files.forEach(f => log('info', `  ${f}`));
  }
}

function diagnoseDocumentation() {
  section('Documentation');
  
  const docs = [
    'README.md',
    'QUICKSTART.md',
    '.github/SETUP.md'
  ];
  
  for (const doc of docs) {
    const docPath = path.join(__dirname, doc);
    if (fs.existsSync(docPath)) {
      const stat = fs.statSync(docPath);
      const lines = fs.readFileSync(docPath, 'utf8').split('\n').length;
      log('ok', `${doc} (${lines} lines)`);
    } else {
      log('warn', `${doc} (missing)`);
    }
  }
}

function systemRequirements() {
  section('System Requirements');
  
  // Node version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.split('.')[0].slice(1));
  const isCompatible = majorVersion >= 18;
  
  log(isCompatible ? 'ok' : 'error', `Node.js: ${nodeVersion} ${isCompatible ? '(>= 18)' : '(need 18+)'}`);
  
  // Platform
  const platform = process.platform;
  log('info', `Platform: ${platform}`);
  
  // Memory
  const memTotal = Math.round(require('os').totalmem() / 1024 / 1024 / 1024);
  const memFree = Math.round(require('os').freemem() / 1024 / 1024 / 1024);
  log('info', `Memory: ${memFree}GB free / ${memTotal}GB total`);
}

function recommendations() {
  section('Recommendations');
  
  const issues = [];
  
  // Check .env
  if (!fs.existsSync('.env')) {
    issues.push('Run: cp .env.example .env');
  }
  
  // Check OPENROUTER_API_KEY
  if (fs.existsSync('.env')) {
    const content = fs.readFileSync('.env', 'utf8');
    if (!content.match(/OPENROUTER_API_KEY=[\w-]/)) {
      issues.push('Add OPENROUTER_API_KEY to .env from openrouter.ai');
    }
  }
  
  // Check node_modules
  if (!fs.existsSync('node_modules')) {
    issues.push('Run: npm install');
  }
  
  // Check state
  if (!fs.existsSync('state')) {
    issues.push('Run: npm start to generate state/ directory');
  }
  
  if (issues.length === 0) {
    log('ok', 'No issues detected!');
    log('info', '  Ready to run: npm start');
  } else {
    issues.forEach((issue, idx) => {
      log('warn', `${idx + 1}. ${issue}`);
    });
  }
}

function main() {
  heading('WorldMiniApp Agent System Diagnostics');
  
  console.log(`${colors.gray}Node.js: ${process.version}`);
  console.log(`Platform: ${process.platform}`);
  console.log(`Working directory: ${process.cwd()}${colors.reset}\n`);
  
  diagnoseAgents();
  diagnoseModels();
  diagnoseEnvironment();
  diagnoseShared();
  diagnoseState();
  diagnosePackages();
  diagnoseWorkflows();
  diagnoseDocumentation();
  systemRequirements();
  recommendations();
  
  heading('End of Diagnostics');
}

main();
