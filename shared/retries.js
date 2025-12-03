// Simple retry helper with exponential backoff + jitter
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Add jitter to reduce thundering herd
function jitterMs(baseMs) {
  const jitter = Math.random() * 0.1 * baseMs;
  return baseMs + (Math.random() > 0.5 ? jitter : -jitter);
}

async function retry(fn, options = {}) {
  const maxAttempts = options.maxAttempts || 3;
  const baseDelay = options.baseDelay || 500; // ms
  const onRetry = options.onRetry || null;
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt >= maxAttempts) throw err;
      const delayMs = jitterMs(baseDelay * Math.pow(2, attempt - 1));
      if (onRetry) onRetry(attempt, err, delayMs);
      await sleep(delayMs);
    }
  }
}

module.exports = { retry };
