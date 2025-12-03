#!/usr/bin/env node
/**
 * Quick Pipeline Runner with Status Report
 * Usage: node run-pipeline.js [--with-llm]
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const enableLLM = process.argv.includes('--with-llm');
const specPath = process.argv[2] || 'tests/fixtures/example-spec.json';

console.log('\n' + '═'.repeat(70));
console.log('  🤖 WorldMiniApp Agent Pipeline Runner');
console.log('═'.repeat(70));
console.log(`📋 Specification: ${specPath}`);
console.log(`🧠 LLM Mode: ${enableLLM ? '✅ ENABLED' : '❌ DISABLED'}`);
console.log(`⏰ Started: ${new Date().toISOString()}`);
console.log('─'.repeat(70) + '\n');

// Set environment variables
process.env.ENABLE_LLM = enableLLM ? '1' : '0';
process.env.OPENROUTER_TOTAL_TOKEN_BUDGET = '0';  // No global limit for testing
process.env.CIRCUIT_THRESHOLD = '3';
process.env.CIRCUIT_COOLDOWN_MS = '30000';

// Try to load from .env if needed
if (!process.env.OPENROUTER_API_KEY && enableLLM) {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/OPENROUTER_API_KEY\s*=\s*[']?([^'\n]+)[']?/);
    if (match && match[1]) {
      process.env.OPENROUTER_API_KEY = match[1].trim();
      console.log('📝 Loaded OPENROUTER_API_KEY from .env\n');
    }
  }
}

// Spawn the runner
const child = spawn('node', ['scripts/run-all-agents.js', specPath], {
  stdio: 'inherit',
  env: process.env
});

child.on('close', (code) => {
  // Read and display final metrics
  setTimeout(() => {
    const metricsPath = path.join(__dirname, '..', 'state', 'metrics.json');
    const statePath = path.join(__dirname, '..', 'state', 'runner-state.json');

    console.log('\n' + '═'.repeat(70));
    console.log('  📊 EXECUTION SUMMARY');
    console.log('═'.repeat(70));

    if (fs.existsSync(statePath)) {
      try {
        const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        const completed = state.results.filter(r => r.status === 'ok').length;
        const failed = state.results.filter(r => r.status === 'error').length;
        
        console.log(`\n✅ Agents Completed: ${completed}/${state.results.length}`);
        if (failed > 0) console.log(`❌ Agents Failed: ${failed}`);
        console.log(`🏃 Run ID: ${state.runId}`);
        console.log(`⏱️ Duration: ${new Date(state.results[state.results.length - 1].metadata.timestamp) - new Date(state.results[0].metadata.timestamp)}ms`);
      } catch (e) {
        console.log('⚠️ Could not parse runner state');
      }
    }

    if (fs.existsSync(metricsPath)) {
      try {
        const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
        console.log(`\n📈 LLM Metrics:`);
        console.log(`  • Calls: ${metrics.llm_calls}`);
        console.log(`  • Errors: ${metrics.llm_errors}`);
        console.log(`  • Avg Latency: ${metrics.avg_latency_ms}ms`);
        console.log(`  • Total Tokens: ${metrics.total_tokens}`);
        if (metrics.llm_calls > 0) {
          console.log(`  • Success Rate: ${((metrics.llm_calls - metrics.llm_errors) / metrics.llm_calls * 100).toFixed(1)}%`);
        }
      } catch (e) {
        console.log('⚠️ Could not parse metrics');
      }
    }

    console.log('\n📁 Output Files:');
    console.log(`  • State: state/runner-state.json`);
    console.log(`  • Metrics: state/metrics.json`);
    console.log(`  • Artifacts: See state/runner-state.json for full list\n`);

    console.log('═'.repeat(70));
    if (code === 0) {
      console.log('✨ Pipeline execution completed successfully!\n');
    } else {
      console.log(`⚠️ Pipeline exited with code ${code}\n`);
    }
  }, 100);
});
