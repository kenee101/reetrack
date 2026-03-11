import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AutoFailProcessor } from './auto-fail.processor';
import { AutoFailQueueService } from './auto-fail-queue.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from 'src/database/entities/invoice.entity';
import { Payment } from 'src/database/entities/payment.entity';
import { MemberSubscription } from 'src/database/entities';
import { OrganizationSubscription } from 'src/database/entities';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'auto-fail',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT as string) || 6379,
      },
      defaultJobOptions: {
        removeOnComplete: 10, // Keep recent successes
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
