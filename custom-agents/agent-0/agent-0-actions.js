const fs = require('fs');
const path = require('path');
const { retry } = require('../../shared/retries');

const stateDir = path.resolve('./state');
const statePath = path.join(stateDir, 'agent-0-state.json');

function dispatchTask(agentId, task) {
  // Simple dispatch stub that logs and returns a task envelope
  console.log(`Dispatching task to ${agentId}:`, task);
  return { dispatched_to: agentId, task };
}

function saveState(state) {
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  return statePath;
}

async function execute(payload) {
  // payload: { action: 'dispatch'|'saveState', args }
  try {
      if (payload.action === 'dispatch') {
        const res = dispatchTask(payload.args.agentId, payload.args.task);
        return { status: 'ok', path: null, content: res };
      }
      if (payload.action === 'saveState') {
        const p = saveState(payload.args.state);
        return { status: 'ok', path: p, content: payload.args.state };
      }
      if (payload.action === 'execute') {
        const options = payload.args.options || {};
        if (options && options.correctionFromLLM) {
          const corrected = options.correctionFromLLM;
          const content = corrected && corrected.content !== undefined ? corrected.content : corrected;
          const outPath = options.outputPath || (corrected && corrected.path) || null;
          return { status: 'ok', path: outPath, content };
        }
      }
      return { status: 'error', path: null, content: `Unknown action ${payload.action}` };
  } catch (err) {
    return { status: 'error', path: null, content: String(err) };
  }
}

module.exports = { dispatchTask, saveState, execute };
