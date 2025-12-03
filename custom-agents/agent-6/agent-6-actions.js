const fs = require('fs');
const path = require('path');
const { callOpenRouter, selectBestModel } = require('../../shared/openrouter');

function configureDocker(service, image, ports) {
  return `Servicio ${service} configurado con imagen ${image} y puertos ${ports.join(', ')}`;
}

function generateK8sDeployment(service, containerImage, replicas = 1) {
  return {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: { name: `${service}-deployment` },
    spec: { replicas, template: { spec: { containers: [{ name: service, image: containerImage }] } } }
  };
}

async function execute(options = {}) {
  try {
    if (options && options.correctionFromLLM) {
      const corrected = options.correctionFromLLM;
      const content = corrected && corrected.content !== undefined ? corrected.content : corrected;
      const outPath = options.outputPath || (corrected && corrected.path) || null;
      try {
        if (outPath) {
          path.dirname(outPath) && fs.mkdirSync(path.dirname(outPath), { recursive: true });
          fs.writeFileSync(outPath, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
        }
      } catch (e) {}
      return { status: 'ok', path: outPath, content };
    }
    const services = options.services || [{ name: 'api', image: 'node:18', ports: [3000] }];
    const results = services.map(s => ({ service: s.name, docker: configureDocker(s.name, s.image, s.ports), k8s: generateK8sDeployment(s.name, s.image) }));

    if (options.llmGenerate) {
      try {
        const model = selectBestModel('agent-6', 'infrastructure');
        console.log(`🐳 Agent-6 using model: ${model}`);
        const prompt = `Generate Dockerfile and docker-compose for: ${JSON.stringify(services)}`;
        const messages = [{ role: 'user', content: prompt }];
        const generated = await callOpenRouter(model, messages, { max_tokens: 1500, agentName: 'agent-6' });
        results.generated = generated;
      } catch (e) {
        console.warn(`⚠️ Agent-6 LLM generation failed: ${e.message}`);
      }
    }

    const outPath = options.outputPath || `infrastructure/config_${options.taskId || Date.now()}.json`;
    path.dirname(outPath) && fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
    return { status: 'ok', path: outPath, content: results };
  } catch (err) {
    return { status: 'error', path: null, content: String(err) };
  }
}

module.exports = { configureDocker, generateK8sDeployment, execute };
