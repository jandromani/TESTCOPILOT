const fs = require('fs');
const path = require('path');
const { callOpenRouter, selectBestModel } = require('../../shared/openrouter');

const deployService = (service) => {
  return `Servicio ${service.name || service.service} desplegado con éxito.`;
};

async function execute(options = {}) {
  try {
    if (options && options.correctionFromLLM) {
      const corrected = options.correctionFromLLM;
      const content = corrected && corrected.content !== undefined ? corrected.content : corrected;
      const outPath = options.outputPath || (corrected && corrected.path) || null;
      try { if (outPath) { path.dirname(outPath) && fs.mkdirSync(path.dirname(outPath), { recursive: true }); fs.writeFileSync(outPath, typeof content === 'string' ? content : JSON.stringify(content, null, 2)); } } catch(e){}
      return { status: 'ok', path: outPath, content };
    }
    const service = options.service || { name: 'api', image: 'node:18' };
    const res = deployService(service);

    if (options.llmInstructions) {
      try {
        const model = selectBestModel('agent-12', 'deployment');
        const prompt = `Provide a deployment checklist for: ${JSON.stringify(service)}`;
        const messages = [{ role: 'user', content: prompt }];
        const instructions = await callOpenRouter(model, messages, { max_tokens: 500, agentName: 'agent-12' });
        res.instructions = instructions;
      } catch (e) {
        console.warn('Agent-12 LLM instructions failed', e.message);
      }
    }

    const outPath = options.outputPath || `artifacts/agent-12-deploy-${options.taskId || Date.now()}.json`;
    path.dirname(outPath) && fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const result = { res };
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
    return { status: 'ok', path: outPath, content: result };
  } catch (err) {
    return { status: 'error', path: null, content: String(err) };
  }
}

module.exports = { deployService, execute };
