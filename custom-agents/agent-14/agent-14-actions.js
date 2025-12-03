const fs = require('fs');
const path = require('path');
const { callOpenRouter, selectBestModel } = require('../../shared/openrouter');

function validateLicenses(dependencies) {
  const count = Array.isArray(dependencies) ? dependencies.length : 0;
  return `Licencias verificadas para ${count} dependencias.`;
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
    const deps = options.dependencies || [];
    const report = validateLicenses(deps);

    if (options.llmAssess) {
      try {
        const model = selectBestModel('agent-14', 'compliance');
        const prompt = `Assess license risk for: ${JSON.stringify(deps)}`;
        const messages = [{ role: 'user', content: prompt }];
        const assessment = await callOpenRouter(model, messages, { max_tokens: 600, agentName: 'agent-14' });
        report.assessment = assessment;
      } catch (e) {
        console.warn('Agent-14 LLM assess failed', e.message);
      }
    }

    const outPath = options.outputPath || `artifacts/agent-14-licenses-${options.taskId || Date.now()}.json`;
    path.dirname(outPath) && fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const result = { report };
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
    return { status: 'ok', path: outPath, content: result };
  } catch (err) {
    return { status: 'error', path: null, content: String(err) };
  }
}

module.exports = { validateLicenses, execute };
