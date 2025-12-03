#!/usr/bin/env node

/**
 * Local Validator Script
 * Verifica que toda la configuración esté lista para ejecutar el sistema de agentes.
 * 
 * Uso: node validate.js
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(type, msg) {
  const emoji = {
    ok: '✅',
    error: '❌',
    warn: '⚠️',
    info: 'ℹ️'
  }[type] || type;
  
  const color = {
    ok: colors.green,
    error: colors.red,
    warn: colors.yellow,
    info: colors.blue
  }[type] || colors.reset;
  
  console.log(`${color}${emoji} ${msg}${colors.reset}`);
}

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    log('ok', `Found: ${description} (${filePath})`);
    return true;
  } else {
    log('error', `Missing: ${description} (${filePath})`);
    return false;
  }
}

function checkJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    JSON.parse(content);
    return true;
  } catch (e) {
    log('error', `Invalid JSON in ${filePath}: ${e.message}`);
    return false;
  }
}

function checkEnv() {
  const envFile = '.env';
  if (!fs.existsSync(envFile)) {
    log('warn', `No .env file found. Create from .env.example`);
    if (fs.existsSync('.env.example')) {
      fs.copyFileSync('.env.example', '.env');
      log('ok', 'Created .env from .env.example');
    }
    return false;
  }
  
  const envContent = fs.readFileSync(envFile, 'utf8');
  if (envContent.includes('OPENROUTER_API_KEY=')) {
    const hasValue = !envContent.match(/OPENROUTER_API_KEY=\s*$/) && 
                    !envContent.match(/OPENROUTER_API_KEY=your-key/i);
    if (hasValue) {
      log('ok', 'OPENROUTER_API_KEY is configured');
      return true;
    } else {
      log('error', 'OPENROUTER_API_KEY is not set in .env');
      return false;
    }
  }
  return false;
}

function checkAgents() {
  let allOk = true;
  const agentDir = path.join(__dirname, 'custom-agents');
  
  if (!fs.existsSync(agentDir)) {
    log('error', 'No custom-agents directory');
    return false;
  }
  
  for (let i = 0; i <= 17; i++) {
    const agentPath = path.join(agentDir, `agent-${i}`);
    const files = [
      `agent-${i}.agent.md`,
      `agent-${i}-config.md`,
      `agent-${i}-actions.js`
    ];
    
    let agentOk = true;
    for (const file of files) {
      if (!fs.existsSync(path.join(agentPath, file))) {
        agentOk = false;
        break;
      }
    }
    
    if (agentOk) {
      log('ok', `Agent-${i}: All files present`);
    } else {
      log('error', `Agent-${i}: Missing files`);
      allOk = false;
    }
  }
  
  return allOk;
}

function checkModelsConfig() {
  const modelsPath = path.join(__dirname, 'models-config.json');
  if (!checkFile(modelsPath, 'models-config.json')) return false;
  if (!checkJSON(modelsPath)) return false;
  
  try {
    const config = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));
    
    if (!config.free_models || config.free_models.length === 0) {
      log('error', 'No free_models defined in models-config.json');
      return false;
    }
    
    log('ok', `Free models available: ${config.free_models.length}`);
    config.free_models.forEach(m => log('info', `  - ${m}`));
    
    if (!config.agent_models || Object.keys(config.agent_models).length === 0) {
      log('warn', 'No agent_models mapping defined; will use defaults');
      return true;
    }
    
    const mappedAgents = Object.keys(config.agent_models).length;
    log('ok', `Agent models mapped: ${mappedAgents}/18`);
    return true;
  } catch (e) {
    log('error', `models-config.json parse error: ${e.message}`);
    return false;
  }
}

function checkShared() {
  const sharedDir = path.join(__dirname, 'shared');
  const requiredFiles = [
    'openrouter.js',
    'retries.js',
    'utils.js',
    'common-tools.json',
    'shared-config.json'
  ];
  
  let allOk = true;
  for (const file of requiredFiles) {
    if (!checkFile(path.join(sharedDir, file), `shared/${file}`)) {
      allOk = false;
    }
  }
  
  return allOk;
}

function checkRunner() {
  const runnerPath = path.join(__dirname, 'src', 'runner.js');
  return checkFile(runnerPath, 'src/runner.js');
}

function checkPackageJson() {
  const pkgPath = path.join(__dirname, 'package.json');
  if (!checkFile(pkgPath, 'package.json')) return false;
  if (!checkJSON(pkgPath)) return false;
  
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const requiredDeps = ['node-fetch', 'pdf-parse'];
    
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const dep of requiredDeps) {
      if (deps[dep]) {
        log('ok', `Dependency found: ${dep}`);
      } else {
        log('warn', `Optional dependency not installed: ${dep}`);
      }
    }
    
    return true;
  } catch (e) {
    log('error', `package.json parse error: ${e.message}`);
    return false;
  }
}

function main() {
  console.log(`\n${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║  WorldMiniApp Agent System Validator   ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════╝${colors.reset}\n`);

  const checks = [
    { name: 'Environment Setup', fn: checkEnv },
    { name: 'Shared Utilities', fn: checkShared },
    { name: 'Models Configuration', fn: checkModelsConfig },
    { name: 'Agent Structure', fn: checkAgents },
    { name: 'Runner Script', fn: checkRunner },
    { name: 'Package Dependencies', fn: checkPackageJson }
  ];

  let passCount = 0;
  const results = [];

  for (const check of checks) {
    console.log(`\n${colors.cyan}▶ ${check.name}${colors.reset}`);
    const passed = check.fn();
    results.push({ name: check.name, passed });
    if (passed) passCount++;
  }

  console.log(`\n${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║  Validation Summary                    ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════╝${colors.reset}\n`);

  for (const result of results) {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
  }

  console.log(`\n${colors.green}Passed: ${passCount}/${checks.length}${colors.reset}\n`);

  if (passCount === checks.length) {
    log('ok', 'All checks passed! You can run: npm start');
    process.exit(0);
  } else {
    log('error', 'Some checks failed. Review above and try again.');
    process.exit(1);
  }
}

main();
