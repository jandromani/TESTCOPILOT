const Ajv = require('ajv');
const schema = require('../schemas/agent-output.schema.json');
const openrouter = require('./openrouter');

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

async function validateAndCorrect(agentName, agentModule, options, result) {
  const wrapped = {
    status: result && result.status ? result.status : 'ok',
    content: result && result.content !== undefined ? result.content : result,
    path: result && result.path ? result.path : null,
    metadata: { agent: agentName, runId: options.runId || 'unknown', timestamp: new Date().toISOString(), model: null }
  };

  let valid = validate(wrapped);
  let errors = null;
  if (!valid) errors = validate.errors;

  let attempts = 1;
  while (!valid && attempts < 3) {
    attempts += 1;
    try {
      const retryOpts = Object.assign({}, options, { retryAttempt: attempts });
      const retryRes = await agentModule.execute(retryOpts);
      wrapped.status = retryRes && retryRes.status ? retryRes.status : 'ok';
      wrapped.content = retryRes && retryRes.content !== undefined ? retryRes.content : retryRes;
      wrapped.path = retryRes && retryRes.path ? retryRes.path : null;
      wrapped.metadata.timestamp = new Date().toISOString();
      valid = validate(wrapped);
      if (!valid) errors = validate.errors;
    } catch (e) {
      wrapped.status = 'error';
      wrapped.content = String(e);
      break;
    }
  }

  if (!valid) {
    // LLM correction allowed only if ENABLE_LLM env var set
    if (process.env.ENABLE_LLM === '1' || process.env.ENABLE_LLM === 'true') {
      try {
          const model = openrouter.selectBestModel(agentName, 'fix');
          const promptLines = [
            'Produce a single, valid JSON object that matches the agent output schema. Do NOT add any explanatory text. If you must format, return the JSON either raw or enclosed in a single code fence (```json ... ```).',
            `Agent: ${agentName}`,
            `RunId: ${options.runId}`,
            `ValidationErrors: ${JSON.stringify(errors, null, 2)}`,
            `PreviousOutput: ${JSON.stringify(wrapped.content, null, 2)}`
          ];
          const prompt = promptLines.join('\n');
          const messages = [
            { role: 'system', content: 'You are a strict JSON-only formatter. Output exactly one JSON object and nothing else.' },
            { role: 'user', content: prompt }
          ];
          const llmResp = await openrouter.callOpenRouter(model, messages, { max_tokens: 1500 });
          // llmResp may include markdown/code fences or extra text. Try robust extraction.
          let parsed = null;
          const respText = typeof llmResp === 'string' ? llmResp : (llmResp && llmResp.text) || JSON.stringify(llmResp);
          const strip = (s) => {
            if (!s) return s;
            // Remove surrounding whitespace
            let t = s.trim();
            // If wrapped in ```json ... ``` or ``` ... ``` remove fences
            const fenceMatch = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
            if (fenceMatch) t = fenceMatch[1].trim();
            // If there's leading/trailing non-json, attempt to extract first {...} block
            if (!t.startsWith('{')) {
              const m = t.match(/\{[\s\S]*\}/m);
              if (m) t = m[0];
            }
            return t;
          };
          const candidate = strip(respText);
          try { parsed = JSON.parse(candidate); } catch (e) { parsed = null; }
        if (parsed) {
          const correctedOpts = Object.assign({}, options, { correctionFromLLM: parsed });
          const correctedRes = await agentModule.execute(correctedOpts);
          return correctedRes;
        }
      } catch (e) {
        // fall through to return error below
        console.warn(`${agentName}: LLM correction failed:`, e && e.message);
      }
    }
    return { status: 'error', path: wrapped.path, content: { note: 'validation_failed', errors } };
  }

  return { status: wrapped.status, path: wrapped.path, content: wrapped.content };
}

module.exports = { validateAndCorrect };
