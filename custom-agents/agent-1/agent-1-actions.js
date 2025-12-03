const fs = require('fs');
const path = require('path');
const { callOpenRouter, selectBestModel } = require('../../shared/openrouter');
let pdfParse;
try { pdfParse = require('pdf-parse'); } catch (e) { pdfParse = null; }

function parseJSONSpec(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const obj = JSON.parse(raw);
  return obj;
}

async function processPDF(filePath) {
  if (!pdfParse) {
    console.warn('pdf-parse not installed; returning placeholder spec');
    return { title: path.basename(filePath), characters: [], plot_points: [] };
  }
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  const text = data && data.text ? data.text : '';
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const title = lines.length ? lines[0].slice(0,120) : path.basename(filePath);
  const characters = [];
  for (const l of lines.slice(0,200)) {
    const low = l.toLowerCase();
    if (low.startsWith('characters:') || low.startsWith('personajes:')) {
      const rest = l.split(':').slice(1).join(':');
      rest.split(',').map(s => s.trim()).filter(Boolean).forEach(c => characters.push(c));
      break;
    }
  }
  const plot_points = lines.filter(l => l.length > 20 && l.length < 200).slice(0,5);
  return { title, characters, plot_points };
}

async function execute(options = {}) {
  try {
    if (options && options.correctionFromLLM) {
      const corrected = options.correctionFromLLM;
      const content = corrected && corrected.content !== undefined ? corrected.content : corrected;
      const outPath = options.outputPath || (corrected && corrected.path) || null;
      return { status: 'ok', path: outPath, content };
    }
    if (options.type === 'json' && options.path) {
      const obj = parseJSONSpec(options.path);
      return { status: 'ok', path: options.path, content: obj };
    }
    if (options.type === 'pdf' && options.path) {
      const obj = await processPDF(options.path);
      return { status: 'ok', path: options.path, content: obj };
    }
    // fallback: use OpenRouter to summarize if requested
    if (options.llmSummarize) {
      try {
        // Use agent-1's specific model from config (Gemini Flash for analysis)
        const model = selectBestModel('agent-1', 'parse');
        console.log(`📝 Agent-1 using model: ${model}`);
        const messages = [{ role: 'user', content: options.llmSummarize }];
        const resp = await callOpenRouter(model, messages, { max_tokens: 400, agentName: 'agent-1' });
        return { status: 'ok', path: null, content: { summary: resp } };
      } catch (e) {
        console.warn(`⚠️ Agent-1 LLM call failed: ${e.message}`);
        return { status: 'error', path: null, content: String(e) };
      }
    }
    return { status: 'error', path: null, content: 'No input provided to agent-1 execute' };
  } catch (err) {
    return { status: 'error', path: null, content: String(err) };
  }
}

module.exports = { parseJSONSpec, processPDF, execute };
