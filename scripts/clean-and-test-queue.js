#!/usr/bin/env node

const Bull = require('bull');

const autoFailQueue = new Bull('auto-fail', {
  redis: {
    host: 'localhost',
    port: 6379,
  },
});

async function cleanAndTest() {
  console.log('=== CLEANING UP FAILED JOBS ===\n');

  try {
    // Get all failed jobs
    const failed = await autoFailQueue.getFailed();
    console.log(`Found ${failed.length} failed jobs`);

    // Clean all failed jobs
    await autoFailQueue.clean(0, 'failed');
    console.log('Cleaned all failed jobs\n');

    // Check queue status after cleanup
    const waiting = await autoFailQueue.getWaiting();
    const active = await autoFailQueue.getActive();
    const delayed = await autoFailQueue.getDelayed();
    const failedAfter = await autoFailQueue.getFailed();
    const completed = await autoFailQueue.getCompleted();

    console.log('=== QUEUE STATUS AFTER CLEANUP ===');
    console.log(`Waiting: ${waiting.length}`);
    console.log(`Active: ${active.length}`);
    console.log(`Delayed: ${delayed.length}`);
    console.log(`Failed: ${failedAfter.length}`);
    console.log(`Completed: ${completed.length}\n`);

    // Add a test job
    console.log('=== ADDING TEST JOB ===');
    const testJob = await autoFailQueue.add(
      'cancel-invoice',
      { type: 'invoice', id: 'test-invoice-123' },
      {
        delay: 5000, // 5 seconds
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );

    console.log(`Added test job with ID: ${testJob.id}`);
    console.log('Job will process in 5 seconds...\n');

    // Wait and check status
    setTimeout(async () => {
      const delayed = await autoFailQueue.getDelayed();
      const active = await autoFailQueue.getActive();
      const completed = await autoFailQueue.getCompleted();
      const failed = await autoFailQueue.getFailed();

      console.log('=== STATUS AFTER 5 SECONDS ===');
      console.log(`Delayed: ${delayed.length}`);
      console.log(`Active: ${active.length}`);
      console.log(`Completed: ${completed.length}`);
      console.log(`Failed: ${failed.length}`);

      await autoFailQueue.close();
    }, 6000);
  } catch (error) {
    console.error('Error:', error);
    await autoFailQueue.close();
  }
}

cleanAndTest();
