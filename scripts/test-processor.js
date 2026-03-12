#!/usr/bin/env node

const Bull = require('bull');

// Create a simple test processor
const testQueue = new Bull('test-processor', {
  redis: {
    host: 'localhost',
    port: 6379,
  },
});

// Process the job
testQueue.process('test-job', async (job) => {
  console.log(`Processing job ${job.id} with data:`, job.data);

  // Simulate some work
  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log(`Completed job ${job.id}`);
  return { success: true, processedAt: new Date().toISOString() };
});

async function testProcessor() {
  console.log('=== TESTING PROCESSOR DIRECTLY ===\n');

  try {
    // Add a test job
    const job = await testQueue.add('test-job', { message: 'Hello World!' });
    console.log(`Added test job: ${job.id}\n`);

    // Wait for completion
    testQueue.on('completed', (job, result) => {
      console.log('✅ Job completed:', result);
    });

    testQueue.on('failed', (job, err) => {
      console.log('❌ Job failed:', err.message);
    });

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check final status
    const completed = await testQueue.getCompleted();
    const failed = await testQueue.getFailed();

    console.log(
      `\nFinal status - Completed: ${completed.length}, Failed: ${failed.length}`,
    );

    await testQueue.close();
  } catch (error) {
    console.error('Test error:', error);
    await testQueue.close();
  }
}

testProcessor();
