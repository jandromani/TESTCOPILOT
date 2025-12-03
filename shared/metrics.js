const fs = require('fs');
const path = require('path');

const metrics = {
  llm_calls: 0,
  llm_latency_ms: [],
  llm_errors: 0,
  total_tokens: 0,
  llm_tokens_samples: [],
  lastUpdated: null
};

function recordLLMCall(latencyMs, ok = true, tokensUsed = null) {
  metrics.llm_calls += 1;
  metrics.llm_latency_ms.push(latencyMs);
  if (!ok) metrics.llm_errors += 1;
  if (typeof tokensUsed === 'number') {
    metrics.total_tokens += tokensUsed;
    metrics.llm_tokens_samples.push(tokensUsed);
  }
  metrics.lastUpdated = new Date().toISOString();
}

function snapshot() {
  const avgLatency = metrics.llm_latency_ms.length ? Math.round(metrics.llm_latency_ms.reduce((a,b)=>a+b,0)/metrics.llm_latency_ms.length) : 0;
  const avgTokens = metrics.llm_tokens_samples.length ? Math.round(metrics.llm_tokens_samples.reduce((a,b)=>a+b,0)/metrics.llm_tokens_samples.length) : 0;
  return {
    llm_calls: metrics.llm_calls,
    llm_errors: metrics.llm_errors,
    avg_latency_ms: avgLatency,
    avg_tokens: avgTokens,
    total_tokens: metrics.total_tokens,
    latency_samples: metrics.llm_latency_ms.slice(-50),
    token_samples: metrics.llm_tokens_samples.slice(-50),
    lastUpdated: metrics.lastUpdated
  };
}

function writeMetricsState(baseDir = process.cwd()) {
  try {
    const stateDir = path.join(baseDir, 'state');
    if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });
    const p = path.join(stateDir, 'metrics.json');
    fs.writeFileSync(p, JSON.stringify(snapshot(), null, 2));
    return p;
  } catch (e) {
    console.warn('Failed writing metrics', e && e.message);
    return null;
  }
}

module.exports = { recordLLMCall, snapshot, writeMetricsState };
