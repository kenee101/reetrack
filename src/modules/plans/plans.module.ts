import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';
import { MemberPlan } from '../../database/entities/member-plan.entity';
import {
  Member,
  MemberSubscription,
  Organization,
  OrganizationPlan,
  OrganizationSubscription,
  OrganizationUser,
} from 'src/database/entities';
import { Email } from '../../database/entities/email.entity';
import { PlanLimitService } from './plans-limit.service';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MemberPlan,
      Member,
      MemberSubscription,
      Organization,
      OrganizationPlan,
      OrganizationSubscription,
      OrganizationUser,
      Email,
    ]),
    forwardRef(() => PaymentsModule),
  ],
  controllers: [PlansController],
  providers: [PlansService, PlanLimitService],
  exports: [PlansService, PlanLimitService],
})
export class PlansModule {}
