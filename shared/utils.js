// Shared JS utilities for agents
function safeJSONParse(s) {
  try {
    return JSON.parse(s);
  } catch (e) {
    return null;
  }
}

function ensureArray(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

module.exports = { safeJSONParse, ensureArray };
