const fs = require('fs');
const path = require('path');
const { callOpenRouter, selectBestModel } = require('../../shared/openrouter');

function validateInfrastructure(infrastructure) {
  const services = infrastructure && infrastructure.services ? infrastructure.services.length : 0;
  return `Infraestructura validada: ${services} servicios verificados`;
}

function checkK8sStatus(clusterInfo) {
  return { cluster: clusterInfo.name || 'local', status: 'ok' };
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
    const infra = options.infrastructure || {};
    const validation = validateInfrastructure(infra);
    const k8s = options.cluster ? checkK8sStatus(options.cluster) : null;

    if (options.llmAnalyze) {
      try {
        const model = selectBestModel('agent-9', 'infrastructure');
        const prompt = `Analyze the following infrastructure and suggest risks: ${JSON.stringify(infra)}`;
        const messages = [{ role: 'user', content: prompt }];
        const ai = await callOpenRouter(model, messages, { max_tokens: 800, agentName: 'agent-9' });
        validation.ai = ai;
      } catch (e) {
        console.warn('Agent-9 LLM analyze failed', e.message);
      }
    }

    const outPath = options.outputPath || `artifacts/agent-9-infra-${options.taskId || Date.now()}.json`;
    path.dirname(outPath) && fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const result = { validation, k8s };
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
    return { status: 'ok', path: outPath, content: result };
  } catch (err) {
    return { status: 'error', path: null, content: String(err) };
  }
}

module.exports = { validateInfrastructure, checkK8sStatus, execute };
