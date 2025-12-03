// Orchestrator runner that calls agent execute() methods in sequence with state persistence
// Integrates with agent-0 and uses OpenRouter for LLM calls via shared/openrouter.js
// All models are free tier from OpenRouter

const path = require('path');
const fs = require('fs');
const agent0 = require('../custom-agents/agent-0/agent-0-actions');
const agent1 = require('../custom-agents/agent-1/agent-1-actions');
const agent2 = require('../custom-agents/agent-2/agent-2-actions');
const agent3 = require('../custom-agents/agent-3/agent-3-actions');
const agent4 = require('../custom-agents/agent-4/agent-4-actions');
const agent5 = require('../custom-agents/agent-5/agent-5-actions');
const { callOpenRouter } = require('../shared/openrouter');
const modelsConfig = require('../models-config.json');

const stateDir = path.resolve('./state');

function ensureStateDir() {
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }
}

function getAgentModel(agentName) {
  // Read model from config, with fallback to first free model
  const model = modelsConfig.agent_models?.[agentName] || 
                modelsConfig.free_models?.[0] || 
                'x-ai/grok-4.1-fast:free';
  return model;
}

function saveRunState(state) {
  ensureStateDir();
  const filePath = path.join(stateDir, 'runner-state.json');
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
  console.log(`📍 State saved to ${filePath}`);
  return filePath;
}

function loadRunState() {
  const filePath = path.join(stateDir, 'runner-state.json');
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return { agents: {}, artifacts: [], createdAt: new Date().toISOString() };
}

async function executeAgent(agentName, agentModule, options) {
  console.log(`\n⚙️ Executing ${agentName}...`);
  if (!agentModule.execute) {
    console.warn(`⚠️ ${agentName} has no execute() method; skipping.`);
    return null;
  }
  try {
    // Ensure runId is passed
    options = Object.assign({ runId: options && options.runId ? options.runId : `run_${Date.now()}` }, options || {});

    const result = await agentModule.execute(options);

    // Normalize and return
    console.log(`✅ ${agentName}: status=${result && result.status ? result.status : 'ok'}, path=${result && result.path ? result.path : 'N/A'}`);
    return result;
  } catch (err) {
    console.error(`❌ ${agentName} error: ${err && err.message ? err.message : err}`);
    return { status: 'error', path: null, content: String(err) };
  }
}

async function runFullPipeline(inputSpecPath) {
  console.log('🚀 Runner: starting full orchestrated pipeline with state persistence');
  console.log(`📦 Using OpenRouter (free tier models only)`);
  ensureStateDir();
  
  // Prepare AJV validator for agent output schema (optional)
  let validateOutput = null;
  try {
    const Ajv = require('ajv');
    const ajv = new Ajv({ allErrors: true, strict: false });
    const schema = require('../schemas/agent-output.schema.json');
    validateOutput = ajv.compile(schema);
  } catch (e) {
    console.warn('AJV not available or schema missing in src/runner; skipping output validation', e && e.message);
  }

  // Helper: validate result and optionally request LLM correction then re-run agent
  async function validateAndCorrect(agentName, agentModule, options, result) {
    if (!validateOutput) return result;
    const wrapped = {
      status: result && result.status ? result.status : 'ok',
      content: result && result.content !== undefined ? result.content : result,
      path: result && result.path ? result.path : null,
      metadata: { agent: agentName, runId: options.runId || 'unknown', timestamp: new Date().toISOString(), model: null }
    };
    let valid = validateOutput(wrapped);
    let errors = null;
    if (!valid) errors = validateOutput.errors;

    let attempts = 1;
    while (!valid && attempts < 3) {
      attempts += 1;
      try {
        const retryOpts = Object.assign({}, options, { retryAttempt: attempts });
        const retryRes = await executeAgent(agentName, agentModule, retryOpts);
        wrapped.status = retryRes && retryRes.status ? retryRes.status : 'ok';
        wrapped.content = retryRes && retryRes.content !== undefined ? retryRes.content : retryRes;
        wrapped.path = retryRes && retryRes.path ? retryRes.path : null;
        wrapped.metadata.timestamp = new Date().toISOString();
        valid = validateOutput(wrapped);
        if (!valid) errors = validateOutput.errors;
      } catch (e) {
        wrapped.status = 'error';
        wrapped.content = String(e);
        break;
      }
    }

    if (!valid) {
      // If LLM enabled, request correction
      if (process.env.ENABLE_LLM === '1' || process.env.ENABLE_LLM === 'true') {
        try {
          const { selectBestModel, callOpenRouter } = require('../shared/openrouter');
          const model = selectBestModel(agentName, 'fix');
          const prompt = `You are given a JSON Schema validation error list and previous output. Produce a corrected JSON object that satisfies the schema.\nAgent: ${agentName}\nRunId: ${options.runId}\nValidationErrors: ${JSON.stringify(errors, null, 2)}\nPreviousOutput: ${JSON.stringify(wrapped.content, null, 2)}\nReturn ONLY the corrected JSON object.`;
          const messages = [{ role: 'system', content: 'Return a corrected JSON object only.' }, { role: 'user', content: prompt }];
          const llmResp = await callOpenRouter(model, messages, { max_tokens: 1500, agentName });
          let parsed = null;
          try { parsed = JSON.parse(llmResp); } catch (e) {
            const m = llmResp.match(/\{[\s\S]*\}/m);
            if (m) {
              try { parsed = JSON.parse(m[0]); } catch (e2) { parsed = null; }
            }
          }
          if (parsed) {
            const correctedOpts = Object.assign({}, options, { correctionFromLLM: parsed });
            const correctedRes = await executeAgent(agentName, agentModule, correctedOpts);
            return correctedRes;
          }
        } catch (e) {
          console.warn(`${agentName}: LLM correction attempt failed:`, e && e.message);
        }
      }
      // Return original wrapped error
      return { status: 'error', path: wrapped.path, content: { note: 'validation_failed', errors } };
    }

    return { status: wrapped.status, path: wrapped.path, content: wrapped.content };
  }

  let runState = loadRunState();
  const runId = `run_${Date.now()}`;
  runState.runId = runId;

  // Step 1: Agent 0 - Initialize state
  console.log('\n--- Phase 1: Initialization (Agent 0) ---');
  const a0Result = await executeAgent('Agent-0', agent0, { action: 'saveState', args: { state: { runId, status: 'started', timestamp: new Date().toISOString() } } });
  runState.agents['A0'] = a0Result;

  // Step 2: Agent 1 - Parse input (JSON or PDF)
  console.log('\n--- Phase 2: Parse Input (Agent 1) ---');
  let inputOptions = {};
  if (inputSpecPath) {
    if (inputSpecPath.toLowerCase().endsWith('.json')) {
      inputOptions = { type: 'json', path: inputSpecPath };
    } else if (inputSpecPath.toLowerCase().endsWith('.pdf')) {
      inputOptions = { type: 'pdf', path: inputSpecPath };
    }
  } else {
    // Generate dummy specs
    inputOptions = { llmSummarize: 'Genera especificaciones mínimas para un sistema de gestión de tareas.' };
  }
  const a1Raw = await executeAgent('Agent-1', agent1, Object.assign({}, inputOptions, { runId }));
  const a1Result = await validateAndCorrect('Agent-1', agent1, Object.assign({}, inputOptions, { runId }), a1Raw);
  runState.agents['A1'] = a1Result;
  if (a1Result.status === 'error') {
    console.warn('⚠️ Agent-1 failed; using fallback specs');
    a1Result.content = { title: 'Demo', characters: [], plot_points: [] };
  }

  // Step 3: Agent 2 - Generate tasks
  console.log('\n--- Phase 3: Generate Tasks (Agent 2) ---');
  const a2Opts = { 
    specifications: a1Result.content || {}, 
    default_owner: 'A3',
    outputPath: path.join(stateDir, `tasks_${runId}.json`),
    runId
  };
  const a2Raw = await executeAgent('Agent-2', agent2, a2Opts);
  const a2Result = await validateAndCorrect('Agent-2', agent2, a2Opts, a2Raw);
  runState.agents['A2'] = a2Result;
  const tasks = (a2Result.content && a2Result.content.tasks) || [];

  // Step 4: Agent 3 - DB Schema
  console.log('\n--- Phase 4: Generate DB Schema (Agent 3) ---');
  const a3Opts = {
    data: a1Result.content || {},
    taskId: runId,
    outputPath: path.join(stateDir, `schema_${runId}.sql`),
    runId
  };
  const a3Raw = await executeAgent('Agent-3', agent3, a3Opts);
  const a3Result = await validateAndCorrect('Agent-3', agent3, a3Opts, a3Raw);
  runState.agents['A3'] = a3Result;

  // Step 5: Agent 4 - Backend API
  console.log('\n--- Phase 5: Generate Backend API (Agent 4) ---');
  const a4Opts = {
    endpoints: [
      { endpoint: '/api/tasks', method: 'GET', description: 'Get all tasks' },
      { endpoint: '/api/tasks', method: 'POST', description: 'Create task' }
    ],
    taskId: runId,
    outputPath: path.join(stateDir, `api_${runId}.json`),
    runId
  };
  const a4Raw = await executeAgent('Agent-4', agent4, a4Opts);
  const a4Result = await validateAndCorrect('Agent-4', agent4, a4Opts, a4Raw);
  runState.agents['A4'] = a4Result;

  // Step 6: Agent 5 - Frontend Components
  console.log('\n--- Phase 6: Generate Frontend Components (Agent 5) ---');
  const a5Opts = {
    components: [
      { name: 'TaskList', type: 'Table', fields: ['id', 'title', 'status'] },
      { name: 'TaskForm', type: 'Form', fields: ['title', 'description'] }
    ],
    taskId: runId,
    outputPath: path.join(stateDir, `components_${runId}.json`),
    runId
  };
  const a5Raw = await executeAgent('Agent-5', agent5, a5Opts);
  const a5Result = await validateAndCorrect('Agent-5', agent5, a5Opts, a5Raw);
  runState.agents['A5'] = a5Result;

  // Collect artifacts
  runState.artifacts = [a1Result, a2Result, a3Result, a4Result, a5Result].filter(r => r && r.path);

  // Optional: Demo OpenRouter LLM call with free model
  console.log('\n--- Phase 7: OpenRouter LLM Demo (Free Model) ---');
  try {
    const model = getAgentModel('agent-1'); // Use agent-1's model (Gemini Flash)
    console.log(`🤖 Calling OpenRouter with FREE model: ${model}`);
    const demoMessages = [{ 
      role: 'user', 
      content: `Summarize the following project in 2 sentences: Title="${a1Result.content?.title || 'Demo'}", Tasks=${tasks.length}` 
    }];
    const llmResp = await callOpenRouter(model, demoMessages, { temperature: 0.2, max_tokens: 150, agentName: 'agent-1' });
    console.log('📢 LLM Response:', llmResp);
    runState.llmSummary = llmResp;
  } catch (e) {
    console.warn('⚠️ OpenRouter call skipped/failed:', e.message);
    console.warn('   Make sure OPENROUTER_API_KEY is set and your account has access to free models');
  }

  // Save final state
  console.log('\n--- Pipeline Complete ---');
  runState.status = 'completed';
  runState.completedAt = new Date().toISOString();
  saveRunState(runState);

  console.log(`\n✨ All agents executed. State saved. RunID: ${runId}`);
  console.log(`📊 Models used:`);
  Object.entries(modelsConfig.agent_models || {}).slice(0, 5).forEach(([agent, model]) => {
    console.log(`   ${agent}: ${model}`);
  });
  return runState;
}

if (require.main === module) {
  const input = process.argv[2];
  runFullPipeline(input).catch(err => {
    console.error('❌ Runner error:', err);
    process.exit(1);
  });
}

module.exports = { runFullPipeline, saveRunState, loadRunState, getAgentModel };
