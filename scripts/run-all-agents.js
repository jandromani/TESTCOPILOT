#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

async function run() {
  const cwd = process.cwd();
  const runId = `run-${Date.now()}`;
  const enableLLM = process.env.ENABLE_LLM === '1' || process.env.ENABLE_LLM === 'true';
  const agentsCount = 18; // agent-0 .. agent-17
  const results = [];

  // Prepare AJV validator
  let validateOutput = null;
  try {
    const Ajv = require('ajv');
    const ajv = new Ajv({ allErrors: true, strict: false });
    const schema = require('../schemas/agent-output.schema.json');
    validateOutput = ajv.compile(schema);
    // Preload per-agent schemas if present
    const fs = require('fs');
    const path = require('path');
    const agentSchemas = {};
    const schemasDir = path.join(__dirname, '..', 'schemas');
    if (fs.existsSync(schemasDir)) {
      const files = fs.readdirSync(schemasDir).filter(f => f.endsWith('-output.schema.json'));
      for (const f of files) {
        try {
          const full = path.join(schemasDir, f);
          const s = require(full);
          const name = f.replace('-output.schema.json', '');
          agentSchemas[name] = ajv.compile(s);
        } catch (e) {
          console.warn('Failed to compile agent schema', f, e && e.message);
        }
      }
    }
  } catch (e) {
    console.warn('AJV not available or schema missing; skipping output validation', e && e.message);
  }

  for (let i = 0; i < agentsCount; i++) {
    const agentName = `agent-${i}`;
    const modPath = path.join(cwd, 'custom-agents', agentName, `${agentName}-actions.js`);
    if (!fs.existsSync(modPath)) {
      results.push({ agent: agentName, status: 'missing', path: modPath, content: null });
      console.warn(`${agentName}: module not found at ${modPath}`);
      continue;
    }

    try {
      const mod = require(modPath);
      const hasExecute = typeof mod.execute === 'function';
      if (!hasExecute) {
        results.push({ agent: agentName, status: 'no-execute', path: modPath, content: null });
        console.warn(`${agentName}: execute() not found`);
        continue;
      }

      const baseOptions = {
        taskId: runId,
        runId: runId,
        outputPath: undefined,
        // enable all LLM flags only when explicitly enabled via env
        llmGenerate: enableLLM,
        llmAnalyze: enableLLM,
        llmSummarize: enableLLM,
        llmPlan: enableLLM,
        llmInstructions: enableLLM,
        llmFindings: enableLLM,
        llmAssess: enableLLM,
        llmInsights: enableLLM,
        llmOptimize: enableLLM
      };

      // Per-agent sensible defaults for this broad runner
      let options = Object.assign({}, baseOptions);
      if (agentName === 'agent-0') {
        // Agent-0 expects a payload with action; save a small run state
        options = { action: 'saveState', args: { state: { runId, startedAt: new Date().toISOString() } } };
      }
      if (agentName === 'agent-1') {
        // Agent-1 can parse the example spec JSON in tests/fixtures
        options = Object.assign({}, baseOptions, { type: 'json', path: path.join(cwd, 'tests', 'fixtures', 'example-spec.json') });
      }

      // Call execute and capture response; support both sync and async
      let res = await Promise.resolve(mod.execute(options));

      // Normalize minimal wrapper
      let wrapped = {
        status: res && res.status ? res.status : 'ok',
        content: res && res.content !== undefined ? res.content : res,
        path: res && res.path ? res.path : null,
        metadata: { agent: agentName, runId: runId, timestamp: new Date().toISOString(), model: null }
      };

      // If LLM model was used and provided on the response, attach it
      if (res && res.metadata && res.metadata.model) wrapped.metadata.model = res.metadata.model;

      // Validate output against schema when available
      let valid = true;
      let errors = null;
      if (validateOutput) {
        // Prefer agent-specific schema when present
        const agentSchemaKey = agentName;
        if (typeof agentSchemas !== 'undefined' && agentSchemas[agentSchemaKey]) {
          try {
            valid = agentSchemas[agentSchemaKey](wrapped);
            if (!valid) errors = agentSchemas[agentSchemaKey].errors;
          } catch (e) {
            valid = false;
            errors = [{ message: 'schema_validation_exception', detail: e && e.message }];
          }
        } else {
          valid = validateOutput(wrapped);
          if (!valid) errors = validateOutput.errors;
        }
      }

      // Retry logic for invalid outputs: attempt up to 2 more times
      let attempts = 1;
      while (!valid && attempts < 3) {
        console.warn(`${agentName}: output invalid, attempt ${attempts} -> errors:`, errors);
        attempts += 1;
        try {
          // include run/tracing and retryAttempt
          res = await Promise.resolve(mod.execute(Object.assign({}, options, { retryAttempt: attempts, runId } )));
          wrapped = {
            status: res && res.status ? res.status : 'ok',
            content: res && res.content !== undefined ? res.content : res,
            path: res && res.path ? res.path : null,
            metadata: { agent: agentName, runId: runId, timestamp: new Date().toISOString(), model: null }
          };
          if (res && res.metadata && res.metadata.model) wrapped.metadata.model = res.metadata.model;
          valid = validateOutput ? validateOutput(wrapped) : true;
          if (!valid) errors = validateOutput.errors;
        } catch (e) {
          console.warn(`${agentName}: retry execution error`, e && e.message);
          wrapped.status = 'error';
          wrapped.content = String(e);
          break;
        }
      }

      // If still invalid after retries, optionally call LLM to propose a correction
      if (!valid) {
        if (enableLLM) {
          try {
            const { selectBestModel, callOpenRouter } = require('../shared/openrouter');
            const model = selectBestModel(agentName, 'fix');
            const prompt = `You are given a JSON object and a JSON Schema validation error list. Produce a corrected JSON object that satisfies the schema.
Agent: ${agentName}
RunId: ${runId}
ValidationErrors: ${JSON.stringify(errors, null, 2)}
PreviousOutput: ${JSON.stringify(wrapped.content, null, 2)}
Return ONLY the corrected JSON object.`;
            const messages = [{ role: 'system', content: 'Return a corrected JSON object only.' }, { role: 'user', content: prompt }];
            const llmResp = await callOpenRouter(model, messages, { max_tokens: 1500, agentName: agentName });
            // Try to extract JSON
            let parsed = null;
            try { parsed = JSON.parse(llmResp); } catch (e) {
              // attempt to extract JSON code block
              const m = llmResp.match(/\{[\s\S]*\}/m);
              if (m) {
                try { parsed = JSON.parse(m[0]); } catch (e2) { parsed = null; }
              }
            }

            // If parsed, pass it back to agent as correction hint and re-run execute
            if (parsed) {
              console.log(`${agentName}: received LLM correction, re-invoking agent`);
              res = await Promise.resolve(mod.execute(Object.assign({}, options, { correctionFromLLM: parsed, validationErrors: errors, retryAttempt: attempts + 1, runId } )));
              wrapped = {
                status: res && res.status ? res.status : 'ok',
                content: res && res.content !== undefined ? res.content : res,
                path: res && res.path ? res.path : null,
                metadata: { agent: agentName, runId: runId, timestamp: new Date().toISOString(), model }
              };
              // re-validate
              valid = validateOutput ? validateOutput(wrapped) : true;
              if (!valid) errors = validateOutput.errors;
            } else {
              wrapped.status = 'error';
              wrapped.content = { note: 'validation_failed', errors, llm_suggestion: llmResp };
            }
          } catch (e) {
            console.warn(`${agentName}: LLM correction failed`, e && e.message);
            wrapped.status = 'error';
            wrapped.content = { note: 'validation_failed', errors, llm_error: String(e) };
          }
        } else {
          wrapped.status = 'error';
          wrapped.content = { note: 'validation_failed', errors };
        }
      }

      results.push({ agent: agentName, status: wrapped.status, path: wrapped.path, content: wrapped.content, metadata: wrapped.metadata });
      console.log(`${agentName}: executed → ${wrapped.status}`);
    } catch (err) {
      console.error(`${agentName}: execution error:`, err && err.message ? err.message : err);
      results.push({ agent: agentName, status: 'error', path: modPath, content: String(err) });
    }
  }

  const stateDir = path.join(cwd, 'state');
  if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });
  const statePath = path.join(stateDir, 'runner-state.json');
  const state = { runId, timestamp: new Date().toISOString(), results };
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  console.log(`Wrote ${statePath} — ${results.length} agent results`);
  // Write aggregated metrics if available
  try {
    const { writeMetricsState } = require('../shared/metrics');
    const mPath = writeMetricsState(cwd);
    if (mPath) console.log(`Wrote metrics to ${mPath}`);
  } catch (e) {
    console.warn('Metrics write failed', e && e.message);
  }
}

run().catch(e => {
  console.error('Runner failed:', e && e.stack ? e.stack : e);
  process.exit(1);
});
