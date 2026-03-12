#!/usr/bin/env node

const Bull = require('bull');

// Create a queue that mimics your auto-fail queue
const autoFailQueue = new Bull('auto-fail', {
  redis: {
    host: 'localhost',
    port: 6379,
  },
  settings: {
    stalledInterval: 60000,
    maxStalledCount: 3,
    lockDuration: 300000,
    lockRenewTime: 150000,
  },
});

// Mock processor to simulate what your NestJS processor should do
autoFailQueue.process('cancel-invoice', async (job) => {
  console.log(`Processing cancel-invoice job ${job.id}`);
  console.log(`Job data:`, job.data);

  // Simulate database lookup and processing
  await new Promise((resolve) => setTimeout(resolve, 500));

  console.log(`✅ Successfully processed job ${job.id}`);
  return {
    success: true,
    id: job.data.id,
    processedAt: new Date().toISOString(),
  };
});

autoFailQueue.process('cancel-subscription', async (job) => {
  console.log(`Processing cancel-subscription job ${job.id}`);
  console.log(`Job data:`, job.data);

  await new Promise((resolve) => setTimeout(resolve, 500));

  console.log(`✅ Successfully processed subscription job ${job.id}`);
  return {
    success: true,
    id: job.data.id,
    processedAt: new Date().toISOString(),
  };
});

autoFailQueue.process('fail-payment', async (job) => {
  console.log(`Processing fail-payment job ${job.id}`);
  console.log(`Job data:`, job.data);

  await new Promise((resolve) => setTimeout(resolve, 500));

  console.log(`✅ Successfully processed payment job ${job.id}`);
  return {
    success: true,
    id: job.data.id,
    processedAt: new Date().toISOString(),
  };
});

// Event listeners
autoFailQueue.on('completed', (job, result) => {
  console.log(`🎉 Job ${job.id} completed:`, result);
});

autoFailQueue.on('failed', (job, err) => {
  console.log(`💥 Job ${job.id} failed:`, err.message);
});

autoFailQueue.on('stalled', (job) => {
  console.log(`⚠️ Job ${job.id} stalled`);
});

async function testMockProcessor() {
  console.log('=== TESTING MOCK PROCESSOR ===\n');

  try {
    // Test all three job types
    console.log('1. Testing cancel-invoice...');
    const invoiceJob = await autoFailQueue.add('cancel-invoice', {
      type: 'invoice',
      id: 'test-invoice-789',
    });

    console.log('2. Testing cancel-subscription...');
    const subscriptionJob = await autoFailQueue.add('cancel-subscription', {
      type: 'subscription',
      id: 'test-subscription-789',
    });

    console.log('3. Testing fail-payment...');
    const paymentJob = await autoFailQueue.add('fail-payment', {
      type: 'payment',
      id: 'test-payment-789',
    });

    console.log('\nAll jobs added. Waiting for completion...\n');

    // Wait for all jobs to complete
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Check final status
    const completed = await autoFailQueue.getCompleted();
    const failed = await autoFailQueue.getFailed();
    const active = await autoFailQueue.getActive();

    console.log(`\nFinal status:`);
    console.log(`- Completed: ${completed.length}`);
    console.log(`- Failed: ${failed.length}`);
    console.log(`- Active: ${active.length}`);

    if (completed.length === 3) {
      console.log('\n✅ SUCCESS: All job types work correctly!');
    } else {
      console.log('\n❌ Some jobs failed or are stuck');
    }

    await autoFailQueue.close();
  } catch (error) {
    console.error('Test error:', error);
    await autoFailQueue.close();
  }
}

// Wait a moment for the processor to register
setTimeout(testMockProcessor, 1000);
