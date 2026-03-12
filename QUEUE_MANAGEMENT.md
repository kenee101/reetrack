# ReeTrack Queue Management Guide

## Overview

This guide helps you monitor and manage your Redis Bull queues for the auto-fail functionality.

## Quick Commands

### Monitor Queue Status

```bash
node scripts/queue-manager.js status
```

### Monitor Queue in Real-time

```bash
node scripts/queue-manager.js monitor
```

### Clean Queue

```bash
# Clean all completed and failed jobs
node scripts/queue-manager.js clean

# Clean only failed jobs
node scripts/queue-manager.js clean failed

# Clean only completed jobs
node scripts/queue-manager.js clean completed
```

### Retry Failed Jobs

```bash
node scripts/queue-manager.js retry
```

### Remove Specific Job

```bash
node scripts/queue-manager.js remove <job-id>
```

### Purge All Jobs

```bash
node scripts/queue-manager.js purge
```

## Redis CLI Commands

### View All Queue Keys

```bash
redis-cli keys "bull:auto-fail:*"
```

### Check Queue Lengths

```bash
redis-cli llen bull:auto-fail:waiting
redis-cli llen bull:auto-fail:active
redis-cli llen bull:auto-fail:delayed
```

### View Failed Jobs

```bash
redis-cli zrange bull:auto-fail:failed 0 -1 withscores
```

### View Job Details

```bash
redis-cli hgetall bull:auto-fail:<job-id>
```

## Troubleshooting

### Jobs Are Stuck in Active State

1. Check if your NestJS app is running properly
2. Look for database connection issues
3. Check if entities exist in the database
4. Restart your NestJS application

### Jobs Keep Failing

1. Check the failed reason in the queue status
2. Verify database entities exist
3. Check for database connection issues
4. Review processor logs

### Queue Configuration

Your Bull queue is configured with:

- **Stalled Interval**: 60 seconds (checks for stalled jobs)
- **Max Stalled Count**: 3 (allows 3 stalls before failing)
- **Lock Duration**: 5 minutes (job lock timeout)
- **Lock Renew Time**: 2.5 minutes (renews lock halfway)

## Auto-Fail Process

The auto-fail system handles three types of jobs:

1. **cancel-invoice**: Cancels pending invoices after timeout
2. **cancel-subscription**: Cancels pending subscriptions after timeout
3. **fail-payment**: Marks pending payments as failed after timeout

Each job is scheduled with a 2-minute delay (configurable in `AutoFailQueueService`).

## Testing

### Test Queue Functionality

✅ **Bull Board is now properly integrated!**

### 🚀 **Access Your Dashboard**

After restarting your NestJS app, visit:
**http://localhost:3000/admin/queues**

### 🎯 **Test It Now**

```bash
# Add demo jobs to see Bull Board in action
node scripts/test-bull-board.js
```

### 📊 **What You'll See**

- **Real-time Job Status**: Active, waiting, delayed, failed, completed
- **Job Details**: Data, timestamps, retry attempts, error messages
- **Interactive Controls**: Retry failed jobs, remove stuck jobs, promote delayed jobs
- **Beautiful UI**: Modern, responsive interface with search and filtering

### 🛠️ **Features Available**

- **Job Management**: Retry, remove, duplicate jobs
- **Performance Metrics**: Processing times and queue statistics
- **Real-time Updates**: Live status changes without refreshing
- **Job Search**: Find specific jobs by ID or data
- **Bulk Operations**: Handle multiple jobs at once

### 📱 **Mobile Friendly**

The dashboard works perfectly on mobile devices too!

### 🔧 **Alternative: Standalone Version**

If you prefer a separate dashboard:

```bash
npm install -g @bull-board/cli
bull-board --redis-host localhost --redis-port 6379 --port 3001
```

Then visit `http://localhost:3001` to view your queues.

## Important Notes

- Always check queue status before making changes
- Use `purge` command carefully as it removes all jobs
- Monitor your queue regularly to ensure jobs are processing
- Check your NestJS application logs for processor errors
- Ensure database entities exist before scheduling auto-fail jobs
