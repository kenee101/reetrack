#!/usr/bin/env node

const Bull = require('bull');

const autoFailQueue = new Bull('auto-fail', {
  redis: {
    host: 'localhost',
    port: 6379,
  },
});

async function addTestJobs() {
  console.log('🎯 Adding test jobs for Bull Board demo...\n');

  try {
    // Add different types of jobs to demonstrate Bull Board
    const jobs = [
      {
        name: 'cancel-invoice',
        data: { type: 'invoice', id: 'demo-invoice-001', amount: 99.99 },
        delay: 0,
      },
      {
        name: 'fail-payment',
        data: { type: 'payment', id: 'demo-payment-002', amount: 49.99 },
        delay: 5000, // 5 seconds
      },
      {
        name: 'cancel-subscription',
        data: {
          type: 'subscription',
          id: 'demo-subscription-003',
          plan: 'premium',
        },
        delay: 10000, // 10 seconds
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

      console.log(
        `✅ Added ${jobConfig.name} job (ID: ${job.id}) - delay: ${jobConfig.delay}ms`,
      );
    }

    console.log(
      '\n🎉 Jobs added! Visit http://localhost:3000/admin/queues to see them in Bull Board',
    );
    console.log('📊 You should see:');
    console.log('   - 1 active job (immediate)');
    console.log('   - 1 delayed job (5 seconds)');
    console.log('   - 1 delayed job (10 seconds)');

    await autoFailQueue.close();
  } catch (error) {
    console.error('❌ Error adding test jobs:', error.message);
    await autoFailQueue.close();
  }
}

addTestJobs();
