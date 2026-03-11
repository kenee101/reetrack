import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { Invoice } from '../../database/entities/invoice.entity';
import { Member } from '../../database/entities/member.entity';
import { MemberSubscription } from '../../database/entities/member-subscription.entity';
import { Organization, OrganizationSubscription } from 'src/database/entities';
import { QueuesModule } from '../queues/queues.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      Member,
      MemberSubscription,
      Organization,
      OrganizationSubscription,
    ]),
    QueuesModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
