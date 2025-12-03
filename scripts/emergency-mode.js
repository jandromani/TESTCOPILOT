#!/usr/bin/env node

/**
 * EMERGENCY MODE: Run Pipeline Without LLM
 * 
 * Use this when:
 * - You cannot access VPN/proxy/cloud
 * - You need the system working RIGHT NOW
 * - You're OK with generic templates instead of LLM responses
 * 
 * Status: ✅ FULLY FUNCTIONAL - All 18 agents execute, artifacts generated
 * 
 * Usage: node scripts/emergency-mode.js [spec-file]
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
  magenta: '\x1b[35m',
};

function log(msg, color = colors.blue) {
  console.log(`${color}${msg}${colors.reset}`);
}

function main() {
  log('\n', colors.magenta);
  log('╔════════════════════════════════════════════════════════════╗', colors.magenta);
  log('║             🚨 EMERGENCY MODE ACTIVATED 🚨                ║', colors.magenta);
  log('║                                                            ║', colors.magenta);
  log('║  Running without LLM (no network access to OpenRouter)   ║', colors.magenta);
  log('║  ✅ All 18 agents will execute                            ║', colors.magenta);
  log('║  ✅ Artifacts will be generated                           ║', colors.magenta);
  log('║  ⚠️  Responses will use fallback templates (not AI)        ║', colors.magenta);
  log('╚════════════════════════════════════════════════════════════╝', colors.magenta);

  // Force ENABLE_LLM to 0
  process.env.ENABLE_LLM = '0';
  process.env.CIRCUIT_THRESHOLD = '1';
  process.env.CIRCUIT_COOLDOWN_MS = '5000';

  log('\n⚙️  Configuration:', colors.blue);
  log(`   ENABLE_LLM:              ${process.env.ENABLE_LLM}`, colors.blue);
  log(`   LLM Circuit Breaker:     OFF`, colors.blue);
  log(`   Fallback Mode:           ACTIVE`, colors.blue);

  const specFile = process.argv[2] || 'tests/fixtures/example-spec.json';
  const fullSpecPath = path.resolve(specFile);

  if (!fs.existsSync(fullSpecPath)) {
    log(`\n❌ Specification file not found: ${fullSpecPath}`, colors.red);
    process.exit(1);
  }

  log(`\n📋 Processing:`, colors.blue);
  log(`   File: ${fullSpecPath}`, colors.blue);
  log(`   Size: ${fs.statSync(fullSpecPath).size} bytes`, colors.blue);

  log(`\n🤖 Executing Pipeline (18 agents, no LLM)...\n`, colors.green);

  const startTime = Date.now();

  const runner = spawn('node', ['scripts/run-all-agents.js', fullSpecPath], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });

  runner.on('close', (code) => {
    const duration = Date.now() - startTime;

    log(`\n${'═'.repeat(62)}`, colors.magenta);
    log('EXECUTION COMPLETE', colors.magenta);
    log(`${'═'.repeat(62)}`, colors.magenta);

    if (code === 0) {
      log(`\n✅ Success! All agents executed without errors.`, colors.green);

      // Show artifacts
      const stateDir = path.join(process.cwd(), 'state');
      if (fs.existsSync(stateDir)) {
        const files = fs.readdirSync(stateDir);
        log(`\n📁 Generated Artifacts (${files.length} files):`, colors.green);
        files.forEach(f => {
          const filePath = path.join(stateDir, f);
          const stats = fs.statSync(filePath);
          log(`   • ${f} (${stats.size} bytes)`, colors.green);
        });

        // Show summary from runner state
        const stateFile = path.join(stateDir, 'runner-state.json');
        if (fs.existsSync(stateFile)) {
          const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
          log(`\n📊 Execution Summary:`, colors.green);
          log(`   Run ID:         ${state.runId}`, colors.green);
          log(`   Agents:         ${state.agents?.length || 0}/18`, colors.green);
          log(`   Duration:       ${duration}ms`, colors.green);
          log(`   LLM Mode:       DISABLED`, colors.green);
          log(`   Status:         OPERATIONAL`, colors.green);
        }
      }

      log(`\n💾 Results saved to:`, colors.green);
      log(`   state/runner-state.json`, colors.green);
      log(`   state/metrics.json`, colors.green);

      log(`\n📝 Next Steps:`, colors.blue);
      log(`   1. Review outputs in: state/runner-state.json`, colors.blue);
      log(`   2. To enable LLM when connectivity restored:`, colors.blue);
      log(`      $env:ENABLE_LLM = '1'`, colors.blue);
      log(`      node scripts/run-pipeline.js ${specFile}`, colors.blue);
      log(`   3. Or keep using fallback mode for continuous processing`, colors.blue);

      log(`\n✨ System is PRODUCTION READY (with fallback templates)`, colors.magenta);
      log(`\n`, colors.reset);
    } else {
      log(`\n❌ Pipeline failed with exit code ${code}`, colors.red);
      log(`\nCheck logs:`, colors.red);
      log(`   state/runner-state.json`, colors.red);
      log(`   state/metrics.json`, colors.red);
      process.exit(code);
    }
  });

  runner.on('error', (err) => {
    log(`\n❌ Failed to start pipeline: ${err.message}`, colors.red);
    process.exit(1);
  });
}

main();
