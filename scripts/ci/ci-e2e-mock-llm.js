#!/usr/bin/env node
// CI E2E: mock OpenRouter to return corrected JSON and run the runner
const path = require('path');
const fs = require('fs');

process.env.ENABLE_LLM = '1';
process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 'mock-key';

// Prepare a mock implementation for shared/openrouter
const modPath = path.join(process.cwd(), 'shared', 'openrouter.js');
try {
  const resolved = require.resolve(modPath);
  const mock = {
    selectBestModel: (agentName, taskType) => 'mock-model',
    callOpenRouter: async (model, messages, opts) => {
      // Return a corrected JSON depending on agent name hint in messages
      const joined = (messages || []).map(m => m.content || '').join('\n');
      if (joined.includes('Agent-13') || joined.includes('security')) {
        return JSON.stringify({ scan: 'Mock corrected security scan' });
      }
      // Generic corrected artifact
      return JSON.stringify({ corrected: true, note: 'mock correction' });
    }
  };
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports: mock };
  console.log('✅ Mocked shared/openrouter for CI E2E');
} catch (e) {
  console.warn('Could not mock openrouter:', e && e.message);
}

// Force agent-13 failure on first run to simulate correction loop
process.env.FORCE_AGENT_13_FAILURE = '1';

// Require and run the runner script which will execute run-all-agents (it executes on load)
try {
  require('../run-all-agents');
  // After first run, remove forced failure and run again
  delete process.env.FORCE_AGENT_13_FAILURE;
  console.log('\n--- Re-run to confirm recovery ---');
  require('../run-all-agents');
  console.log('\n✅ CI E2E mock run completed');
  process.exit(0);
} catch (err) {
  console.error('CI E2E run failed:', err && err.stack ? err.stack : err);
  process.exit(2);
}
