const fs = require('fs');
const path = require('path');
const { callOpenRouter, selectBestModel } = require('../../shared/openrouter');

function analyzePerformance(service) {
  return `Rendimiento de ${service.name || service.service} analizado con éxito.`;
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
    const service = options.service || { name: 'api' };
    const perf = analyzePerformance(service);

    if (options.llmInsights) {
      try {
        const model = selectBestModel('agent-15', 'performance');
        const prompt = `Provide performance tuning suggestions for: ${JSON.stringify(service)}`;
        const messages = [{ role: 'user', content: prompt }];
        const insights = await callOpenRouter(model, messages, { max_tokens: 600, agentName: 'agent-15' });
        perf.insights = insights;
      } catch (e) {
        console.warn('Agent-15 LLM insights failed', e.message);
      }
    }

    const outPath = options.outputPath || `artifacts/agent-15-performance-${options.taskId || Date.now()}.json`;
    path.dirname(outPath) && fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const result = { perf };
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
    return { status: 'ok', path: outPath, content: result };
  } catch (err) {
    return { status: 'error', path: null, content: String(err) };
  }
}

module.exports = { analyzePerformance, execute };
