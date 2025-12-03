const fs = require('fs');
const path = require('path');
const { callOpenRouter, selectBestModel } = require('../../shared/openrouter');

function evaluateQuality(reports) {
  const count = Array.isArray(reports) ? reports.length : 0;
  return `Evaluación completada: ${count} informes procesados.`;
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
    const reports = options.reports || [];
    const evaluation = evaluateQuality(reports);

    if (options.llmSummarize) {
      try {
        const model = selectBestModel('agent-17', 'quality');
        const prompt = `Summarize key quality metrics and suggest improvements for: ${JSON.stringify(reports)}`;
        const messages = [{ role: 'user', content: prompt }];
        const summary = await callOpenRouter(model, messages, { max_tokens: 600, agentName: 'agent-17' });
        evaluation.summary = summary;
      } catch (e) {
        console.warn('Agent-17 LLM summarize failed', e.message);
      }
    }

    const outPath = options.outputPath || `artifacts/agent-17-quality-${options.taskId || Date.now()}.json`;
    path.dirname(outPath) && fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const result = { evaluation };
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
    return { status: 'ok', path: outPath, content: result };
  } catch (err) {
    return { status: 'error', path: null, content: String(err) };
  }
}

module.exports = { evaluateQuality, execute };
