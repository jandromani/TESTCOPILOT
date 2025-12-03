const fs = require('fs');
const path = require('path');
const { callOpenRouter, selectBestModel } = require('../../shared/openrouter');

const organizeRepository = (repoStructure) => {
  return `Estructura del repositorio organizada: ${repoStructure.join(', ')}`;
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
    const layout = options.repoStructure || ['src', 'tests', 'docs'];
    const res = organizeRepository(layout);

    if (options.llmPlan) {
      try {
        const model = selectBestModel('agent-11', 'repo');
        const prompt = `Propose a repository layout and CI steps for: ${JSON.stringify(layout)}`;
        const messages = [{ role: 'user', content: prompt }];
        const plan = await callOpenRouter(model, messages, { max_tokens: 600, agentName: 'agent-11' });
        res.plan = plan;
      } catch (e) {
        console.warn('Agent-11 LLM plan failed', e.message);
      }
    }

    const outPath = options.outputPath || `artifacts/agent-11-repo-${options.taskId || Date.now()}.json`;
    path.dirname(outPath) && fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const result = { res };
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
    return { status: 'ok', path: outPath, content: result };
  } catch (err) {
    return { status: 'error', path: null, content: String(err) };
  }
}

module.exports = { organizeRepository, execute };
