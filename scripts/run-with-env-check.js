#!/usr/bin/env node

/**
 * Explicit Environment Loader + Pipeline Runner
 * Manually loads .env, verifies variables, and executes pipeline
 * 
 * Usage: node scripts/run-with-env-check.js [spec-file]
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
require('dotenv').config();

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ️${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bright}${colors.blue}═══ ${msg} ═══${colors.reset}`);
};

function main() {
  log.section('🚀 Pipeline Runner with Environment Verification');

  // Get spec file
  const specFile = process.argv[2] || 'tests/fixtures/example-spec.json';
  
  console.log(`\n⏰ Started: ${new Date().toISOString()}`);
  console.log(`📋 Specification: ${specFile}\n`);

  log.section('Step 1: Verify Environment Variables');

  const requiredVars = {
    'OPENROUTER_API_KEY': true,
    'OPENROUTER_API_URL': false,
    'ENABLE_LLM': false,
  };

  let allSet = true;
  const envDisplay = {};

  for (const [varName, required] of Object.entries(requiredVars)) {
    const value = process.env[varName];
    const isSet = !!value;

    if (varName === 'OPENROUTER_API_KEY' && value) {
      envDisplay[varName] = value.substring(0, 20) + '...' + value.substring(value.length - 5);
    } else {
      envDisplay[varName] = value || '(not set)';
    }

    const status = isSet ? '✓' : '✗';
    const color = isSet ? colors.green : (required ? colors.red : colors.yellow);

    console.log(`${color}${status}${colors.reset} ${varName}: ${envDisplay[varName]}`);

    if (required && !isSet) {
      allSet = false;
    }
  }

  if (!allSet) {
    log.error('\nCritical variables missing!');
    console.log('\nSet them manually in PowerShell:');
    console.log('  $env:OPENROUTER_API_KEY = "your-key-here"');
    console.log('  $env:ENABLE_LLM = "1"');
    process.exit(1);
  }

  log.section('Step 2: Check Specification File');

  const fullSpecPath = path.resolve(specFile);
  
  if (!fs.existsSync(fullSpecPath)) {
    log.error(`Specification file not found: ${fullSpecPath}`);
    process.exit(1);
  }

  log.success(`File exists: ${fullSpecPath}`);
  const stats = fs.statSync(fullSpecPath);
  log.info(`File size: ${stats.size} bytes`);

  log.section('Step 3: Execute Pipeline');

  console.log(`\n🤖 Starting agent pipeline...\n`);

  // Execute pipeline
  const runner = spawn('node', ['scripts/run-all-agents.js', fullSpecPath], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });

  runner.on('close', (code) => {
    console.log(`\n${'─'.repeat(60)}`);
    log.section('Pipeline Complete');

    if (code === 0) {
      log.success('Pipeline executed successfully!');
      
      // Check for artifacts
      const stateDir = path.join(process.cwd(), 'state');
      if (fs.existsSync(stateDir)) {
        const files = fs.readdirSync(stateDir);
        log.info(`Generated ${files.length} artifact files in state/`);
        
        // Look for runner state
        const stateFile = path.join(stateDir, 'runner-state.json');
        if (fs.existsSync(stateFile)) {
          const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
          log.success(`Run ID: ${state.runId || 'unknown'}`);
          log.info(`Agents: ${state.agents?.length || 0}`);
        }
      }

      console.log(`\n⏰ Completed: ${new Date().toISOString()}`);
      console.log(`\n✨ Check results in: state/runner-state.json\n`);
    } else {
      log.error(`Pipeline failed with exit code: ${code}`);
      process.exit(code);
    }
  });

  runner.on('error', (err) => {
    log.error(`Failed to execute pipeline: ${err.message}`);
    process.exit(1);
  });
}

main();
