#!/usr/bin/env node

const Redis = require('ioredis');
const Bull = require('bull');

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

async function checkQueueStatus() {
  console.log('=== AUTO-FAIL QUEUE STATUS ===\n');

  try {
    // Get queue counts
    const waiting = await autoFailQueue.getWaiting();
    const active = await autoFailQueue.getActive();
    const delayed = await autoFailQueue.getDelayed();
    const failed = await autoFailQueue.getFailed();
    const completed = await autoFailQueue.getCompleted();

    console.log(`Waiting: ${waiting.length}`);
    console.log(`Active: ${active.length}`);
    console.log(`Delayed: ${delayed.length}`);
    console.log(`Failed: ${failed.length}`);
    console.log(`Completed: ${completed.length}\n`);

    // Show failed jobs details
    if (failed.length > 0) {
      console.log('=== FAILED JOBS ===');
      for (const job of failed) {
        console.log(`Job ID: ${job.id}`);
        console.log(`Name: ${job.name}`);
        console.log(`Data: ${JSON.stringify(job.data)}`);
        console.log(`Failed Reason: ${job.failedReason}`);
        console.log(`Attempts: ${job.attemptsMade}/${job.opts.attempts}`);
        console.log('---');
      }
    }

    // Show delayed jobs details
    if (delayed.length > 0) {
      console.log('=== DELAYED JOBS ===');
      for (const job of delayed) {
        const delayUntil = new Date(job.timestamp + job.delay);
        console.log(`Job ID: ${job.id}`);
        console.log(`Name: ${job.name}`);
        console.log(`Data: ${JSON.stringify(job.data)}`);
        console.log(`Delayed until: ${delayUntil.toISOString()}`);
        console.log('---');
      }
    }

    // Show active jobs details
    if (active.length > 0) {
      console.log('=== ACTIVE JOBS ===');
      for (const job of active) {
        console.log(`Job ID: ${job.id}`);
        console.log(`Name: ${job.name}`);
        console.log(`Data: ${JSON.stringify(job.data)}`);
        console.log(`Started at: ${new Date(job.timestamp).toISOString()}`);
        console.log('---');
      }
    }
  } catch (error) {
    console.error('Error checking queue status:', error);
  }

  await autoFailQueue.close();
  await redis.quit();
}

checkQueueStatus();
