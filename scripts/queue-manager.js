#!/usr/bin/env node

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

async function queueManager() {
  console.log('🔧 REETRACK QUEUE MANAGER\n');
  console.log('===============================\n');

  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'status':
        await showStatus();
        break;
      case 'clean':
        await cleanQueue(args[1]);
        break;
      case 'retry':
        await retryFailedJobs();
        break;
      case 'remove':
        await removeJob(args[1]);
        break;
      case 'purge':
        await purgeQueue();
        break;
      case 'monitor':
        await monitorQueue();
        break;
      default:
        showHelp();
    }

    await autoFailQueue.close();
    await redis.quit();
  } catch (error) {
    console.error('Error:', error.message);
    await autoFailQueue.close();
    await redis.quit();
  }
}

async function showStatus() {
  console.log('📊 QUEUE STATUS\n');

  const waiting = await autoFailQueue.getWaiting();
  const active = await autoFailQueue.getActive();
  const delayed = await autoFailQueue.getDelayed();
  const failed = await autoFailQueue.getFailed();
  const completed = await autoFailQueue.getCompleted();

  console.log(`Waiting:    ${waiting.length}`);
  console.log(`Active:     ${active.length}`);
  console.log(`Delayed:    ${delayed.length}`);
  console.log(`Failed:     ${failed.length}`);
  console.log(`Completed:  ${completed.length}`);

  if (failed.length > 0) {
    console.log('\n❌ FAILED JOBS:');
    for (const job of failed.slice(0, 5)) {
      console.log(`  ${job.id}: ${job.name} - ${job.failedReason}`);
    }
    if (failed.length > 5) {
      console.log(`  ... and ${failed.length - 5} more`);
    }
  }

  if (active.length > 0) {
    console.log('\n⏳ ACTIVE JOBS:');
    for (const job of active) {
      const duration = job.processedOn ? Date.now() - job.processedOn : 0;
      console.log(
        `  ${job.id}: ${job.name} (running for ${Math.round(duration / 1000)}s)`,
      );
    }
  }
}

async function cleanQueue(type = 'all') {
  console.log(`🧹 CLEANING QUEUE (${type})\n`);

  let cleaned = 0;

  if (type === 'all' || type === 'completed') {
    const completed = await autoFailQueue.getCompleted();
    await autoFailQueue.clean(0, 'completed');
    cleaned += completed.length;
  }

  if (type === 'all' || type === 'failed') {
    const failed = await autoFailQueue.getFailed();
    await autoFailQueue.clean(0, 'failed');
    cleaned += failed.length;
  }

  console.log(`✅ Cleaned ${cleaned} jobs`);
}

async function retryFailedJobs() {
  console.log('🔄 RETRYING FAILED JOBS\n');

  const failed = await autoFailQueue.getFailed();
  let retried = 0;

  for (const job of failed) {
    await job.retry();
    retried++;
  }

  console.log(`✅ Retried ${retried} jobs`);
}

async function removeJob(jobId) {
  if (!jobId) {
    console.log('❌ Please provide a job ID');
    return;
  }

  console.log(`🗑️ REMOVING JOB ${jobId}\n`);

  try {
    const job = await autoFailQueue.getJob(jobId);
    if (job) {
      await job.remove();
      console.log(`✅ Removed job ${jobId}`);
    } else {
      console.log(`❌ Job ${jobId} not found`);
    }
  } catch (error) {
    console.log(`❌ Error removing job: ${error.message}`);
  }
}

async function purgeQueue() {
  console.log('💀 PURGING ALL JOBS\n');

  try {
    await autoFailQueue.clean(0, 'completed');
    await autoFailQueue.clean(0, 'failed');

    // Get and remove active jobs manually
    const active = await autoFailQueue.getActive();
    for (const job of active) {
      await job.remove();
    }

    // Get and remove waiting jobs manually
    const waiting = await autoFailQueue.getWaiting();
    for (const job of waiting) {
      await job.remove();
    }

    // Get and remove delayed jobs manually
    const delayed = await autoFailQueue.getDelayed();
    for (const job of delayed) {
      await job.remove();
    }

    console.log(
      `✅ Queue purged (removed ${active.length + waiting.length + delayed.length} jobs)`,
    );
  } catch (error) {
    console.log(`⚠️ Some jobs couldn't be removed: ${error.message}`);
  }
}

async function monitorQueue() {
  console.log('👁️ MONITORING QUEUE (Ctrl+C to stop)\n');

  const interval = setInterval(async () => {
    process.stdout.write('\r');

    const waiting = await autoFailQueue.getWaiting();
    const active = await autoFailQueue.getActive();
    const delayed = await autoFailQueue.getDelayed();
    const failed = await autoFailQueue.getFailed();
    const completed = await autoFailQueue.getCompleted();

    const timestamp = new Date().toLocaleTimeString();
    process.stdout.write(
      `[${timestamp}] W:${waiting.length} A:${active.length} D:${delayed.length} F:${failed.length} C:${completed.length}`,
    );
  }, 1000);

  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('\n\n👋 Monitoring stopped');
    process.exit(0);
  });
}

function showHelp() {
  console.log('🔧 REETRACK QUEUE MANAGER\n');
  console.log('Usage: node queue-manager.js <command> [options]\n');
  console.log('Commands:');
  console.log('  status     - Show queue status');
  console.log('  clean      - Clean completed and failed jobs');
  console.log('  clean <type> - Clean specific type (completed|failed|all)');
  console.log('  retry      - Retry all failed jobs');
  console.log('  remove <id> - Remove specific job');
  console.log('  purge      - Remove all jobs');
  console.log('  monitor    - Real-time queue monitoring');
  console.log('\nExamples:');
  console.log('  node queue-manager.js status');
  console.log('  node queue-manager.js clean failed');
  console.log('  node queue-manager.js retry');
  console.log('  node queue-manager.js remove 123');
  console.log('  node queue-manager.js monitor');
}

queueManager();
