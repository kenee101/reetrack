#!/usr/bin/env node

const Bull = require('bull');

const autoFailQueue = new Bull('auto-fail', {
  redis: {
    host: 'localhost',
    port: 6379,
  },
});

async function testAutoFail() {
  console.log('=== TESTING AUTO-FAIL FUNCTIONALITY ===\n');

  try {
    // Clean any existing jobs
    await autoFailQueue.clean(0, 'completed');
    await autoFailQueue.clean(0, 'failed');

    // Test 1: Add a job that should process immediately
    console.log('1. Adding immediate job (no delay)...');
    const immediateJob = await autoFailQueue.add(
      'cancel-invoice',
      { type: 'invoice', id: 'test-immediate-123' },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );

    console.log(`Added immediate job: ${immediateJob.id}\n`);

    // Wait 2 seconds and check
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const completed = await autoFailQueue.getCompleted();
    const failed = await autoFailQueue.getFailed();
    const active = await autoFailQueue.getActive();

    console.log('After 2 seconds:');
    console.log(`- Completed: ${completed.length}`);
    console.log(`- Failed: ${failed.length}`);
    console.log(`- Active: ${active.length}\n`);

    if (completed.length > 0) {
      console.log('✅ SUCCESS: Job processed successfully!');
      console.log(
        'Job result:',
        JSON.stringify(completed[0].returnvalue, null, 2),
      );
    } else if (failed.length > 0) {
      console.log('❌ FAILED: Job failed');
      console.log('Failed reason:', failed[0].failedReason);
    } else {
      console.log('⏳ Job still processing or stuck');
    }

    // Test 2: Add a delayed job
    console.log('\n2. Adding delayed job (5 seconds)...');
    const delayedJob = await autoFailQueue.add(
      'fail-payment',
      { type: 'payment', id: 'test-delayed-456' },
      {
        delay: 5000,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );

    console.log(`Added delayed job: ${delayedJob.id}`);
    console.log('Waiting 6 seconds for delayed job to process...\n');

    // Wait 6 seconds and check
    await new Promise((resolve) => setTimeout(resolve, 6000));

    const completed2 = await autoFailQueue.getCompleted();
    const failed2 = await autoFailQueue.getFailed();
    const delayed = await autoFailQueue.getDelayed();

    console.log('After 6 more seconds:');
    console.log(`- Completed: ${completed2.length}`);
    console.log(`- Failed: ${failed2.length}`);
    console.log(`- Delayed: ${delayed.length}\n`);

    if (completed2.length > 1) {
      console.log('✅ SUCCESS: Delayed job also processed!');
    } else if (delayed.length > 0) {
      console.log('⏳ Delayed job still waiting');
    } else {
      console.log('❓ Delayed job status unclear');
    }

    await autoFailQueue.close();
  } catch (error) {
    console.error('Test error:', error);
    await autoFailQueue.close();
  }
}

testAutoFail();
