const fs = require('fs');
const path = require('path');
const { callOpenRouter, selectBestModel } = require('../../shared/openrouter');

function createDatabaseSchema(data) {
  // Produce a simple SQL schema string as placeholder
  const sql = [];
  sql.push(`CREATE TABLE IF NOT EXISTS characters (id INTEGER PRIMARY KEY, name TEXT, role TEXT, backstory TEXT);`);
  sql.push(`CREATE TABLE IF NOT EXISTS plot (scene_id INTEGER PRIMARY KEY, description TEXT, characters_involved TEXT);`);
  return sql.join('\n');
}

async function execute(options = {}) {
  try {
    if (options && options.correctionFromLLM) {
      const corrected = options.correctionFromLLM;
      const content = corrected && corrected.content !== undefined ? corrected.content : corrected;
      const outPath = options.outputPath || (corrected && corrected.path) || null;
      return { status: 'ok', path: outPath, content };
    }
    let sql = createDatabaseSchema(options.data || {});
    
    // Optional: Use LLM to enhance schema if called with llmEnhance flag
    if (options.llmEnhance) {
      try {
        const model = selectBestModel('agent-3', 'sql');
        console.log(`🗄️ Agent-3 using model: ${model}`);
        const prompt = `Enhance this SQL schema with proper constraints and indexes:\n${sql}`;
        const messages = [{ role: 'user', content: prompt }];
        const enhanced = await callOpenRouter(model, messages, { max_tokens: 1000, agentName: 'agent-3' });
        sql = enhanced;
      } catch (e) {
        console.warn(`⚠️ Agent-3 LLM enhancement failed: ${e.message}; using basic schema`);
      }
    }
    
    const outPath = options.outputPath || `db/migrations/${options.taskId || 'migration'}.sql`;
    path.dirname(outPath) && fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, sql);
    return { status: 'ok', path: outPath, content: sql };
  } catch (err) {
    return { status: 'error', path: null, content: String(err) };
  }
}

module.exports = { createDatabaseSchema, execute };
