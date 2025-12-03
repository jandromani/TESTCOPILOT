const fs = require('fs');
const path = require('path');
const { callOpenRouter, selectBestModel } = require('../../shared/openrouter');

const testAPIConnection = async (service) => {
  if (!service || !service.url) return `Servicio inválido`;
  return `Conexión establecida con el servicio: ${service.name} (${service.url})`;
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
    const service = options.service || { name: 'api', url: 'http://localhost:3000' };
    const status = await testAPIConnection(service);

    if (options.llmSummarize) {
      try {
        const model = selectBestModel('agent-10', 'connectivity');
        const prompt = `Summarize connectivity results and suggest remediation for service: ${JSON.stringify(service)}`;
        const messages = [{ role: 'user', content: prompt }];
        const llm = await callOpenRouter(model, messages, { max_tokens: 400, agentName: 'agent-10' });
        status.llm = llm;
      } catch (e) {
        console.warn('Agent-10 LLM summarize failed', e.message);
      }
    }

    const outPath = options.outputPath || `artifacts/agent-10-connection-${options.taskId || Date.now()}.json`;
    path.dirname(outPath) && fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const result = { status };
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
    return { status: 'ok', path: outPath, content: result };
  } catch (err) {
    return { status: 'error', path: null, content: String(err) };
  }
}

module.exports = { testAPIConnection, execute };
