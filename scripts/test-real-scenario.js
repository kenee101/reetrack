#!/usr/bin/env node

const Bull = require('bull');

// Create a simple test to verify the queue setup
const autoFailQueue = new Bull('auto-fail', {
  redis: {
    host: 'localhost',
    port: 6379,
  },
});

async function createRealTest() {
  console.log('=== CREATING REAL TEST SCENARIO ===\n');

  try {
    // Clean the queue first
    await autoFailQueue.clean(0, 'completed');
    await autoFailQueue.clean(0, 'failed');
    await autoFailQueue.clean(0, 'active');

    console.log('Queue cleaned. Adding realistic test jobs...\n');

    // Add jobs that would come from your actual application
    const jobs = [
      {
        name: 'cancel-invoice',
        data: { type: 'invoice', id: 'real-invoice-id-123' },
        delay: 0, // Process immediately
      },
      {
        name: 'fail-payment',
        data: { type: 'payment', id: 'real-payment-id-456' },
        delay: 0,
      },
      {
        name: 'cancel-subscription',
        data: { type: 'subscription', id: 'real-subscription-id-789' },
        delay: 0,
      },
    ];

    for (const jobConfig of jobs) {
      const job = await autoFailQueue.add(jobConfig.name, jobConfig.data, {
        delay: jobConfig.delay,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      console.log(`Added ${jobConfig.name} job: ${job.id}`);
    }

    console.log(
      '\nJobs added. Now check if your NestJS processor handles them...\n',
    );

    // Monitor the queue for 10 seconds
    let checkCount = 0;
    const monitorInterval = setInterval(async () => {
      checkCount++;

      const active = await autoFailQueue.getActive();
      const completed = await autoFailQueue.getCompleted();
      const failed = await autoFailQueue.getFailed();

      console.log(
        `Check ${checkCount}: Active=${active.length}, Completed=${completed.length}, Failed=${failed.length}`,
      );

      if (failed.length > 0) {
        console.log('\n❌ FAILED JOBS DETECTED:');
        for (const job of failed) {
          console.log(`  Job ${job.id} (${job.name}): ${job.failedReason}`);
        }
      }

      if (completed.length > 0) {
        console.log('\n✅ COMPLETED JOBS:');
        for (const job of completed) {
          console.log(
            `  Job ${job.id} (${job.name}): ${JSON.stringify(job.returnvalue)}`,
          );
        }
      }

      if (checkCount >= 10) {
        clearInterval(monitorInterval);
        console.log('\n=== FINAL STATUS ===');

        const finalActive = await autoFailQueue.getActive();
        const finalCompleted = await autoFailQueue.getCompleted();
        const finalFailed = await autoFailQueue.getFailed();

        console.log(`Active: ${finalActive.length}`);
        console.log(`Completed: ${finalCompleted.length}`);
        console.log(`Failed: ${finalFailed.length}`);

        if (finalCompleted.length === 3) {
          console.log('\n🎉 SUCCESS: All jobs processed correctly!');
        } else if (finalFailed.length > 0) {
          console.log(
            '\n💥 FAILURE: Some jobs failed. Check your processor logs.',
          );
        } else {
          console.log(
            '\n⏳ Jobs are still processing or stuck. Check if your NestJS app is running properly.',
          );
        }

        await autoFailQueue.close();
      }
    }, 1000);
  } catch (error) {
    console.error('Test error:', error);
    await autoFailQueue.close();
  }
}

createRealTest();
