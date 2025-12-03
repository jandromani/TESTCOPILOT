const fs = require('fs');
const path = require('path');
const { callOpenRouter, selectBestModel } = require('../../shared/openrouter');

function createComponent(name, type, fields) {
  // Placeholder lógica para crear un componente UI
  return `Componente ${name} de tipo ${type} creado con los siguientes campos: ${fields.join(', ')}`;
}

function connectToAPI(component, endpoint) {
  // Placeholder para generar un fetch/axios call
  return `Conectando componente ${component} a ${endpoint}`;
}

async function execute(options = {}) {
  try {
    // If correctionFromLLM provided, accept it as corrected artifact
    if (options.correctionFromLLM) {
      const corrected = options.correctionFromLLM;
      const outPath = options.outputPath || `frontend/src/components_${options.taskId || 'components'}.json`;
      path.dirname(outPath) && fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(corrected, null, 2));
      return { status: 'ok', path: outPath, content: corrected, metadata: { corrected: true } };
    }

    const comps = options.components || [];
    const results = comps.map(c => ({ name: c.name, code: createComponent(c.name, c.type, c.fields || []) }));
    
    // Optional: Use LLM to generate React components if requested
    if (options.llmGenerate) {
      try {
        const model = selectBestModel('agent-5', 'ui_component');
        console.log(`🎨 Agent-5 using model: ${model}`);
        const prompt = `Generate React components for: ${JSON.stringify(comps.map(c => ({ name: c.name, type: c.type })))}`;
        const messages = [{ role: 'user', content: prompt }];
        const generated = await callOpenRouter(model, messages, { max_tokens: 2000, agentName: 'agent-5' });
        results.generated_jsx = generated;
      } catch (e) {
        console.warn(`⚠️ Agent-5 LLM generation failed: ${e.message}; using placeholder`);
      }
    }
    
    const outPath = options.outputPath || `frontend/src/components_${options.taskId || 'components'}.json`;
    path.dirname(outPath) && fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
    return { status: 'ok', path: outPath, content: results };
  } catch (err) {
    return { status: 'error', path: null, content: String(err) };
  }
}

module.exports = { createComponent, connectToAPI, execute };
