const fs = require('fs');
const path = require('path');
const { callOpenRouter, selectBestModel } = require('../../shared/openrouter');

function analyzeCosts(resources) {
  const count = Array.isArray(resources) ? resources.length : 0;
  return `Costos analizados para ${count} recursos.`;
}

async function execute(options = {}) {
  try {
    if (options && options.correctionFromLLM) {
      const corrected = options.correctionFromLLM;
      const content = corrected && corrected.content !== undefined ? corrected.content : corrected;
      const outPath = options.outputPath || (corrected && corrected.path) || null;
      try { if (outPath) { path.dirname(outPath) && fs.mkdirSync(path.dirname(outPath), { recursive: true }); fs.writeFileSync(outPath, typeof content === 'string' ? content : JSON.stringify(content, null, 2)); } } catch(e){}
      return { status: 'ok', path: outPath, content };
    }
    const resources = options.resources || [];
    const costs = analyzeCosts(resources);

    if (options.llmOptimize) {
      try {
        const model = selectBestModel('agent-16', 'cost');
        const prompt = `Suggest cost optimizations for: ${JSON.stringify(resources)}`;
        const messages = [{ role: 'user', content: prompt }];
        const optim = await callOpenRouter(model, messages, { max_tokens: 600, agentName: 'agent-16' });
        costs.optimizations = optim;
      } catch (e) {
        console.warn('Agent-16 LLM optimize failed', e.message);
      }
    }

    const outPath = options.outputPath || `artifacts/agent-16-costs-${options.taskId || Date.now()}.json`;
    path.dirname(outPath) && fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const result = { costs };
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
    return { status: 'ok', path: outPath, content: result };
  } catch (err) {
    return { status: 'error', path: null, content: String(err) };
  }
}

module.exports = { analyzeCosts, execute };
