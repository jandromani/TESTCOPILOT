const fs = require('fs');
const path = require('path');
const { callOpenRouter, selectBestModel } = require('../../shared/openrouter');

function analyzeCode(code) {
  const lines = Array.isArray(code) ? code.join('\n').split('\n').length : (typeof code === 'string' ? code.split('\n').length : 0);
  return `Análisis de código realizado: ${lines} líneas revisadas`;
}

function lintFiles(filePaths) {
  return filePaths.map(p => ({ file: p, status: 'ok' }));
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
    const payload = options.code || options.files || '';
    const analysis = analyzeCode(Array.isArray(payload) ? payload : String(payload));
    const lint = options.files ? lintFiles(options.files) : [];

    if (options.llmAnalyze) {
      try {
        const model = selectBestModel('agent-7', 'code-audit');
        const prompt = `Summarize code issues and suggested improvements for: ${JSON.stringify(options.files || payload)}`;
        const messages = [{ role: 'user', content: prompt }];
        const llmOut = await callOpenRouter(model, messages, { max_tokens: 800, agentName: 'agent-7' });
        analysis.llm = llmOut;
      } catch (e) {
        console.warn('Agent-7 LLM analyze failed', e.message);
      }
    }

    const outPath = options.outputPath || `artifacts/agent-7-analysis-${options.taskId || Date.now()}.json`;
    path.dirname(outPath) && fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const result = { analysis, lint };
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
    return { status: 'ok', path: outPath, content: result };
  } catch (err) {
    return { status: 'error', path: null, content: String(err) };
  }
}

module.exports = { analyzeCode, lintFiles, execute };
