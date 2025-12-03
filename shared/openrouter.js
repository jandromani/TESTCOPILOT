let fetchFn;
if (typeof fetch === 'function') {
  fetchFn = fetch;
} else {
  try {
    fetchFn = require('node-fetch');
  } catch (e) {
    fetchFn = null;
  }
}
const { recordLLMCall } = require('./metrics');

// Simple circuit breaker state (configurable via env)
const circuit = {
  failures: 0,
  lastFailureAt: null,
  openUntil: null,
  threshold: parseInt(process.env.CIRCUIT_THRESHOLD || '3', 10),
  cooldownMs: parseInt(process.env.CIRCUIT_COOLDOWN_MS || '30000', 10)
};

// Helper to add jitter to exponential backoff (±10%)
function jitterMs(baseMs) {
  const jitter = Math.random() * 0.1 * baseMs;
  return baseMs + (Math.random() > 0.5 ? jitter : -jitter);
}

// Classify error as transient (retry) or permanent (fail fast)
function classifyError(err, statusCode) {
  if (!err) return 'unknown';
  const msg = String(err).toLowerCase();
  if (msg.includes('timeout') || msg.includes('econnrefused') || msg.includes('enotfound')) return 'transient';
  if (statusCode === 401 || statusCode === 403 || statusCode === 400) return 'permanent';
  if (statusCode === 429 || statusCode === 503) return 'transient';
  return 'unknown';
}
const { retry } = require('./retries');

let modelsConfig;
try {
  modelsConfig = require('../models-config.json');
} catch (e) {
  modelsConfig = { free_models: [], agent_models: {} };
}

const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL || 'https://api.openrouter.ai/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Get available free models from config
function getAvailableModels() {
  return modelsConfig.free_models || [
    'x-ai/grok-4.1-fast:free',
    'google/gemini-2.0-flash-exp:free',
    'kwaipilot/kat-coder-pro:free',
    'qwen/qwen3-coder:free'
  ];
}

// Select best model for agent task (reads from models-config.json)
function selectBestModel(agentName, taskType = null) {
  const modelMap = modelsConfig.agent_models || {};
  let model = modelMap[agentName];
  
  if (!model) {
    // Fallback to function-based heuristic
    const taskLower = (taskType || '').toLowerCase();
    if (taskLower.includes('parse') || taskLower.includes('analyze')) {
      model = 'google/gemini-2.0-flash-exp:free';  // Gemini for analysis
    } else if (taskLower.includes('code') || taskLower.includes('api') || taskLower.includes('sql')) {
      model = 'kwaipilot/kat-coder-pro:free';  // Kat-coder for backend/db
    } else if (taskLower.includes('component') || taskLower.includes('ui')) {
      model = 'qwen/qwen3-coder:free';  // Qwen for frontend
    } else {
      model = getAvailableModels()[0];  // Default to first available
    }
  }
  
  return model;
}

async function callOpenRouterWithRetry(model, messages, opts = {}) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not set in environment');
  }

  // Circuit breaker: if open, reject fast
  if (circuit.openUntil && Date.now() < circuit.openUntil) {
    throw new Error(`Circuit open until ${new Date(circuit.openUntil).toISOString()}`);
  }

  // Use retry wrapper for resilience and measure latency
  return retry(async () => {
    // debug: indicate an outgoing LLM request (no key printed)
    try {
      // noop to allow potential synchronous errors to be thrown in fetch availability
    } catch (ex) {}
    // Enforce per-agent and global token limits
    const perAgentLimits = (modelsConfig && modelsConfig.per_agent_token_limits) || {};
    const agentName = opts && opts.agentName ? opts.agentName : null;
    const perAgentLimit = agentName && perAgentLimits[agentName] ? perAgentLimits[agentName] : perAgentLimits.default || 1500;
    const requestedMax = typeof opts.max_tokens === 'number' ? opts.max_tokens : 800;
    const finalMaxTokens = Math.min(requestedMax, perAgentLimit);

    // global guard: optional env var for total tokens allowed per process
    const globalBudget = parseInt(process.env.OPENROUTER_TOTAL_TOKEN_BUDGET || '0', 10) || 0;
    if (globalBudget > 0) {
      try {
        const metricsModule = require('./metrics');
        if (typeof metricsModule.snapshot !== 'function') {
          throw new Error('metrics.snapshot() not available');
        }
        const snapshot = metricsModule.snapshot();
        if (!snapshot || typeof snapshot.total_tokens !== 'number') {
          throw new Error('metrics.snapshot() returned invalid data');
        }
        const totalTokensSoFar = snapshot.total_tokens;
        if (totalTokensSoFar >= globalBudget) {
          throw new Error('Global OpenRouter token budget exhausted');
        }
      } catch (e) {
        // Strict behavior: if we cannot confirm budget availability, fail fast
        throw new Error('Global OpenRouter token budget check failed: ' + (e && e.message ? e.message : String(e)));
      }
    }

    const body = {
      model: model,
      messages: messages,
      temperature: typeof opts.temperature === 'number' ? opts.temperature : 0.2,
      max_tokens: finalMaxTokens
    };

    if (!fetchFn) throw new Error('fetch is not available (install node-fetch or run on Node 18+)');
    const start = Date.now();
    let res;
    try {
      res = await fetchFn(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://github.com/worldminiapp/agents'
      },
      body: JSON.stringify(body)
      });
    } catch (fetchErr) {
      // Network / DNS / TLS errors etc — increment failures and rethrow with details
      circuit.failures += 1;
      circuit.lastFailureAt = Date.now();
      if (circuit.failures >= circuit.threshold) {
        circuit.openUntil = Date.now() + circuit.cooldownMs;
      }
      recordLLMCall(Date.now() - start, false);
      throw new Error(`fetch failed: ${fetchErr && fetchErr.message ? fetchErr.message : String(fetchErr)}`);
    }
    const latency = Date.now() - start;

    if (!res.ok) {
      const txt = await res.text();
      // record failure
      circuit.failures += 1;
      circuit.lastFailureAt = Date.now();
      if (circuit.failures >= circuit.threshold) {
        circuit.openUntil = Date.now() + circuit.cooldownMs;
      }
      recordLLMCall(latency, false);
      // include status and trimmed body in error
      const trimmed = String(txt).slice(0, 200);
      throw new Error(`OpenRouter API error ${res.status}: ${trimmed}`);
    }

    // success -> reset circuit failures
    circuit.failures = 0;
    circuit.lastFailureAt = null;
    circuit.openUntil = null;

    const data = await res.json();
    // capture tokens if provider returns usage
    const tokens = data && data.usage && (data.usage.total_tokens || data.usage.total_tokens === 0) ? data.usage.total_tokens : null;
    recordLLMCall(latency, true, tokens);
    // Expecting standard chat completion response; return text content of first choice
    if (data && data.choices && data.choices.length) {
      return data.choices[0].message && data.choices[0].message.content ? data.choices[0].message.content : JSON.stringify(data);
    }
    return JSON.stringify(data);
  }, { maxAttempts: opts.maxRetries || 3, baseDelay: opts.baseDelay || 1000 });
}

// Backward compatibility
async function callOpenRouter(model, messages, opts = {}) {
  return callOpenRouterWithRetry(model, messages, opts);
}

module.exports = { 
  callOpenRouter, 
  callOpenRouterWithRetry,
  selectBestModel,
  getAvailableModels,
  OPENROUTER_API_URL,
  OPENROUTER_API_KEY
};
