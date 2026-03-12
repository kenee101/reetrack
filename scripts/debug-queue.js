#!/usr/bin/env node

// Simple debugging script to check what's happening
const Bull = require('bull');
const Redis = require('ioredis');

const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

const autoFailQueue = new Bull('auto-fail', {
  redis: {
    host: 'localhost',
    port: 6379,
  },
});

async function debugQueue() {
  console.log('=== DEBUGGING QUEUE ISSUES ===\n');

  try {
    // Get active jobs and their details
    const active = await autoFailQueue.getActive();

    console.log(`Active jobs: ${active.length}\n`);

    for (const job of active) {
      console.log(`Job ID: ${job.id}`);
      console.log(`Name: ${job.name}`);
      console.log(`Data: ${JSON.stringify(job.data)}`);
      console.log(`Timestamp: ${new Date(job.timestamp).toISOString()}`);
      console.log(
        `Processed on: ${job.processedOn ? new Date(job.processedOn).toISOString() : 'Not started'}`,
      );
      console.log(`Progress: ${job.progress()}\n`);
    }

    // Check Redis keys for more details
    console.log('=== REDIS KEYS ===');
    const keys = await redis.keys('bull:auto-fail:*');

    for (const key of keys) {
      const type = await redis.type(key);
      console.log(`${key}: ${type}`);

      if (type === 'hash' && key.includes(':')) {
        const data = await redis.hgetall(key);
        if (data.failedReason) {
          console.log(`  Failed reason: ${data.failedReason}`);
        }
        if (data.stalledCounter) {
          console.log(`  Stalled count: ${data.stalledCounter}`);
        }
      }
    }

    console.log('\n=== RECOMMENDATIONS ===');
    console.log(
      '1. Your NestJS processor is likely hanging on database operations',
    );
    console.log('2. Check if your database connection is working');
    console.log('3. Look for any errors in your NestJS application logs');
    console.log(
      "4. The processor might be looking for entities that don't exist",
    );
    console.log('5. Try restarting your NestJS app with the new Bull settings');

    await autoFailQueue.close();
    await redis.quit();
  } catch (error) {
    console.error('Debug error:', error);
    await autoFailQueue.close();
    await redis.quit();
  }
}

debugQueue();
