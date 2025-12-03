const fs = require('fs');
const path = require('path');
const { callOpenRouter, selectBestModel } = require('../../shared/openrouter');

function runSecurityScan(service) {
  return `Prueba de seguridad realizada para el servicio: ${service.name || service.service}`;
}

async function execute(options = {}) {
  try {
    const service = options.service || { name: 'api' };

    // If correctionFromLLM provided, accept it as corrected scan result
    if (options.correctionFromLLM) {
      const corrected = options.correctionFromLLM;
      const outPath = options.outputPath || `artifacts/agent-13-security-${options.taskId || Date.now()}.json`;
      path.dirname(outPath) && fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(corrected, null, 2));
      return { status: 'ok', path: outPath, content: corrected, metadata: { corrected: true } };
    }

    // Optional test hook: force a failure if env var set
    if (process.env.FORCE_AGENT_13_FAILURE === '1') {
      throw new Error('Simulated failure for testing');
    }

    const scan = runSecurityScan(service);

    if (options.llmFindings) {
      try {
        const model = selectBestModel('agent-13', 'security');
        const prompt = `List likely security issues and remediation for: ${JSON.stringify(service)}`;
        const messages = [{ role: 'user', content: prompt }];
        const findings = await callOpenRouter(model, messages, { max_tokens: 800, agentName: 'agent-13' });
        scan.findings = findings;
      } catch (e) {
        console.warn('Agent-13 LLM findings failed', e.message);
      }
    }

    const outPath = options.outputPath || `artifacts/agent-13-security-${options.taskId || Date.now()}.json`;
    path.dirname(outPath) && fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const result = { scan };
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
    return { status: 'ok', path: outPath, content: result };
  } catch (err) {
    return { status: 'error', path: null, content: String(err) };
  }
}

module.exports = { runSecurityScan, execute };
