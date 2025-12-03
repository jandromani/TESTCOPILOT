const assert = require('assert');
const path = require('path');

// Prepare a mock openrouter module in the require cache before loading validate-and-correct
const openrouterMock = {
  selectBestModel: (agentName, purpose) => 'mock-model',
  callOpenRouter: async (model, messages, opts) => {
    // Return a JSON string that matches the schema
    const corrected = {
      status: 'ok',
      content: { fixed: true, items: [1,2,3] },
      path: null,
      metadata: { agent: 'agent-test', runId: 'run-test-1', timestamp: new Date().toISOString() }
    };
    // Intentionally wrap in code fences to test parsing robustness
    return '```json\n' + JSON.stringify(corrected, null, 2) + '\n```';
  }
};

// inject into require cache for shared/openrouter
const orPath = require.resolve('../shared/openrouter');
require.cache[orPath] = { id: orPath, filename: orPath, loaded: true, exports: openrouterMock };

process.env.ENABLE_LLM = '1';
const { validateAndCorrect } = require('../shared/validate-and-correct');

async function testValidateAndCorrect() {
  // Create a fake agent module that returns invalid output (missing metadata)
  const fakeAgent = {
    execute: async (opts) => {
      if (opts && opts.correctionFromLLM) {
        // Return the correction as the agent's accepted output
        return { status: 'ok', path: opts.outputPath || null, content: opts.correctionFromLLM, metadata: { agent: 'agent-test', runId: opts.runId || 'run-test-1', timestamp: new Date().toISOString() } };
      }
      // Always return an invalid status to force retries and then LLM correction
      return { status: 'invalid_status', path: null, content: 'still invalid' };
    }
  };

  // Provide an invalid status to force validation failure and trigger LLM correction
  const result = await validateAndCorrect('agent-test', fakeAgent, { runId: 'run-test-1' }, { status: 'invalid_status', content: 'bad' });
  console.log('validateAndCorrect returned:', JSON.stringify(result, null, 2));
  assert(result && result.status === 'ok', 'Expected corrected status ok');
  // Accept metadata either at root or inside content (agents may wrap corrections differently)
  const hasMeta = (result && result.metadata) || (result && result.content && result.content.metadata);
  assert(hasMeta, 'Expected corrected output to include metadata (root or content.metadata)');
  console.log('validateAndCorrect unit test passed');
}

testValidateAndCorrect().catch(err => { console.error(err); process.exit(2); });

// Additional: Validate per-agent schemas compile and accept minimal valid examples
async function testAgentSchemas() {
  const Ajv = require('ajv');
  const fs = require('fs');
  const schemasDir = path.join(__dirname, '..', 'schemas');
  if (!fs.existsSync(schemasDir)) {
    console.warn('No schemas directory found, skipping schema unit tests');
    return;
  }
  const ajv = new Ajv({ allErrors: true, strict: false });
  const files = fs.readdirSync(schemasDir).filter(f => f.endsWith('-output.schema.json'));
  for (const f of files) {
    const full = path.join(schemasDir, f);
    const s = require(full);
    const validate = ajv.compile(s);
    // build a minimal valid sample
    const agentKey = f.replace('-output.schema.json', '');
    const sample = { status: 'ok', content: {}, metadata: { agent: agentKey, runId: 'run-test', timestamp: new Date().toISOString() } };
    const ok = validate(sample);
    if (!ok) {
      console.error(`Schema ${f} rejected minimal sample:`, validate.errors);
      throw new Error(`Schema ${f} invalid`);
    }
    console.log(`Schema ${f} compiled and validated minimal sample`);
  }
  console.log('All agent schema unit tests passed');
}

testAgentSchemas().catch(err => { console.error(err); process.exit(3); });

// --- Token budget & metrics snapshot tests ---
async function testTokenBudgetExceeded() {
  console.log('\nRunning token budget exceeded test...');
  // Ensure any openrouter cache mock is cleared so we load the real module
  const orPath = require.resolve('../shared/openrouter');
  if (require.cache[orPath]) delete require.cache[orPath];

  // Mock metrics to show we already used 200 tokens
  const metricsPath = require.resolve('../shared/metrics');
  require.cache[metricsPath] = { id: metricsPath, filename: metricsPath, loaded: true, exports: { snapshot: () => ({ total_tokens: 200 }) } };

  process.env.OPENROUTER_API_KEY = 'test-key';
  process.env.OPENROUTER_TOTAL_TOKEN_BUDGET = '100';

  try {
    const openrouter = require('../shared/openrouter');
    let threw = false;
    try {
      // This should fail fast due to budget exceeded
      await openrouter.callOpenRouterWithRetry('mock-model', [{ role: 'user', content: 'hi' }], { max_tokens: 10, agentName: 'agent-test' });
    } catch (e) {
      threw = true;
      console.log('Expected error:', e && e.message ? e.message : e);
    }
    assert(threw, 'Expected callOpenRouterWithRetry to throw when budget exceeded');
    console.log('Token budget exceeded test passed');
  } finally {
    // cleanup
    delete process.env.OPENROUTER_TOTAL_TOKEN_BUDGET;
    delete process.env.OPENROUTER_API_KEY;
    if (require.cache[metricsPath]) delete require.cache[metricsPath];
    if (require.cache[orPath]) delete require.cache[orPath];
  }
}

async function testMetricsSnapshotFailure() {
  console.log('\nRunning metrics snapshot failure test...');
  const orPath = require.resolve('../shared/openrouter');
  if (require.cache[orPath]) delete require.cache[orPath];

  // Mock metrics.snapshot to throw
  const metricsPath = require.resolve('../shared/metrics');
  require.cache[metricsPath] = { id: metricsPath, filename: metricsPath, loaded: true, exports: { snapshot: () => { throw new Error('snapshot failure'); } } };

  process.env.OPENROUTER_API_KEY = 'test-key';
  process.env.OPENROUTER_TOTAL_TOKEN_BUDGET = '1000';

  try {
    const openrouter = require('../shared/openrouter');
    let threw = false;
    try {
      await openrouter.callOpenRouterWithRetry('mock-model', [{ role: 'user', content: 'hi' }], { max_tokens: 10, agentName: 'agent-test' });
    } catch (e) {
      threw = true;
      console.log('Expected error due to metrics snapshot failure:', e && e.message ? e.message : e);
    }
    assert(threw, 'Expected callOpenRouterWithRetry to throw when metrics.snapshot fails');
    console.log('Metrics snapshot failure test passed');
  } finally {
    delete process.env.OPENROUTER_TOTAL_TOKEN_BUDGET;
    delete process.env.OPENROUTER_API_KEY;
    if (require.cache[metricsPath]) delete require.cache[metricsPath];
    if (require.cache[orPath]) delete require.cache[orPath];
  }
}

// Run the new tests
testTokenBudgetExceeded().catch(err => { console.error(err); process.exit(4); }).then(() => {
  testMetricsSnapshotFailure().catch(err => { console.error(err); process.exit(5); });
});
