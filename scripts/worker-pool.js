#!/usr/bin/env node
/**
 * BullMQ Worker Pool for Agent Orchestration
 * Allows agents to run in parallel with concurrency control via Redis
 *
 * Usage:
 *   npm install bull dotenv
 *   REDIS_URL=redis://localhost:6379 node scripts/worker-pool.js
 *
 * To submit jobs:
 *   const { Queue } = require('bull');
 *   const q = new Queue('agents', 'redis://localhost:6379');
 *   await q.add('agent-task', { agentId: 'agent-4', runId: 'run-123', options: {...} });
 */

const Queue = require('bull');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '4', 10);

// Create job queue
const agentQueue = new Queue('agents', REDIS_URL);

// Log queue events
agentQueue.on('error', (err) => {
  console.error('❌ Queue error:', err);
});

agentQueue.on('stalled', (job) => {
  console.warn(`⚠️ Job ${job.id} stalled (timeout or worker crashed)`);
});

agentQueue.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed:`, job.data.agentId);
});

agentQueue.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);
});

// Main worker processor
agentQueue.process(CONCURRENCY, async (job) => {
  const { agentId, runId, options } = job.data;
  
  console.log(`\n🚀 [Worker] Processing ${agentId} (job ${job.id})`);
  
  try {
    // Load agent module dynamically
    const modPath = path.join(process.cwd(), 'custom-agents', agentId, `${agentId}-actions.js`);
    if (!fs.existsSync(modPath)) {
      throw new Error(`Agent module not found: ${modPath}`);
    }
    
    // Clear require cache to get fresh module
    delete require.cache[require.resolve(modPath)];
    const agentModule = require(modPath);
    
    if (typeof agentModule.execute !== 'function') {
      throw new Error(`Agent ${agentId} has no execute() function`);
    }
    
    // Execute agent with options
    const result = await Promise.resolve(agentModule.execute(Object.assign({}, options, { runId })));
    
    // Validate result shape
    if (!result || typeof result !== 'object') {
      throw new Error(`Agent ${agentId} returned invalid result: ${typeof result}`);
    }
    
    console.log(`✅ [Worker] ${agentId} completed with status: ${result.status}`);
    return result;
  } catch (err) {
    console.error(`❌ [Worker] ${agentId} failed:`, err.message);
    throw err;
  }
});

console.log(`\n🔧 BullMQ Worker Pool started`);
console.log(`   Redis: ${REDIS_URL}`);
console.log(`   Concurrency: ${CONCURRENCY}`);
console.log(`   Queue: agents`);
console.log(`\n   Waiting for jobs...`);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n⏹️  Shutting down worker gracefully...');
  await agentQueue.close();
  process.exit(0);
});

module.exports = { agentQueue };
