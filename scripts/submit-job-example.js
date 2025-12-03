const { Queue } = require('bull');
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const q = new Queue('agents', REDIS_URL);

async function submit() {
  const job = await q.add('agent-task', { agentId: 'agent-4', runId: `run-${Date.now()}`, options: { llmGenerate: false } });
  console.log('Submitted job', job.id);
  process.exit(0);
}

submit().catch(e => { console.error(e); process.exit(2); });
