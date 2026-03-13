import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AutoFailProcessor } from './auto-fail.processor';
import { AutoFailQueueService } from './auto-fail-queue.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from 'src/database/entities/invoice.entity';
import { Payment } from 'src/database/entities/payment.entity';
import { MemberSubscription } from 'src/database/entities';
import { OrganizationSubscription } from 'src/database/entities';

export const getRedisConfig = () => {
  const redisUrl = process.env.RAILWAY_REDIS_URL;

  if (redisUrl) {
    const url = new URL(redisUrl);
    return {
      host: url.hostname,
      port: Number(url.port),
      password: url.password || undefined,
      username: url.username || 'default',
      tls: url.protocol === 'rediss:' ? {} : undefined, // Upstash requires TLS
    };
  }

  // Local fallback
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT as string) || 6379,
  };
};

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'auto-fail',
      connection: getRedisConfig(),
      defaultJobOptions: {
        removeOnComplete: true, // Auto-remove completed jobs
        removeOnFail: 5, // Keep fewer failures (less critical)
      },
    }),
    TypeOrmModule.forFeature([
      Invoice,
      Payment,
      MemberSubscription,
      OrganizationSubscription,
    ]),
  ],
  providers: [AutoFailProcessor, AutoFailQueueService],
  exports: [AutoFailQueueService],
})
export class QueuesModule {}
