const fs = require('fs');
const path = require('path');
const { callOpenRouter, selectBestModel } = require('../../shared/openrouter');

function createAPI(endpoint, method, description) {
  // Lógica básica para crear un endpoint (placeholder)
  return `API ${endpoint} creada con el método ${method} y descripción: ${description}`;
}

function validateAuth(config) {
  // Placeholder de validación de seguridad
  if (config && config.auth_type === 'jwt') return true;
  return false;
}

async function execute(options = {}) {
  try {
    // If a correction from LLM is provided, prefer it as the corrected output
    if (options.correctionFromLLM) {
      const corrected = options.correctionFromLLM;
      const outPath = options.outputPath || `backend/src/api_${options.taskId || 'api'}.json`;
      path.dirname(outPath) && fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(corrected, null, 2));
      return { status: 'ok', path: outPath, content: corrected, metadata: { corrected: true } };
    }

    const endpoints = options.endpoints || [];
    const results = [];
    for (const ep of endpoints) {
      const code = createAPI(ep.endpoint || ep.path, ep.method || 'GET', ep.description || '');
      results.push({ endpoint: ep.endpoint || ep.path, code });
    }
    
    // Optional: Use LLM to generate actual code if requested
    if (options.llmGenerate) {
      try {
        const model = selectBestModel('agent-4', 'api_code');
        console.log(`🔌 Agent-4 using model: ${model}`);
        const prompt = `Generate Express.js API endpoints for: ${JSON.stringify(endpoints)}`;
        const messages = [{ role: 'user', content: prompt }];
        const generated = await callOpenRouter(model, messages, { max_tokens: 2000, agentName: 'agent-4' });
        results.generated_code = generated;
      } catch (e) {
        console.warn(`⚠️ Agent-4 LLM generation failed: ${e.message}; using placeholder`);
      }
    }
    
    const outPath = options.outputPath || `backend/src/api_${options.taskId || 'api'}.json`;
    path.dirname(outPath) && fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
    return { status: 'ok', path: outPath, content: results };
  } catch (err) {
    return { status: 'error', path: null, content: String(err) };
  }
}

module.exports = { createAPI, validateAuth, execute };
