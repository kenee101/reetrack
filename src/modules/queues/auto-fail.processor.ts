import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { Invoice } from '../../database/entities/invoice.entity';
import { Payment } from '../../database/entities/payment.entity';
import { MemberSubscription } from '../../database/entities/member-subscription.entity';
import {
  InvoiceStatus,
  PaymentStatus,
  SubscriptionStatus,
} from '../../common/enums/enums';
import { OrganizationSubscription } from 'src/database/entities';

// export interface AutoFailJobData {
//   type: 'invoice' | 'payment' | 'subscription' | 'org-subscription';
//   id: string;
// }

@Injectable()
@Processor('auto-fail')
export class AutoFailProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(AutoFailProcessor.name);

  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,

    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,

    @InjectRepository(MemberSubscription)
    private memberSubscriptionRepository: Repository<MemberSubscription>,

    @InjectRepository(OrganizationSubscription)
    private organizationSubscriptionRepository: Repository<OrganizationSubscription>,
  ) {
    super();
  }

  async onModuleInit() {
    this.logger.log('🚀 AutoFailProcessor initialized successfully!');
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`✅ Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`❌ Job ${job.id} failed: ${err.message}`);
  }

  // Job handlers based on job name
  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`🔥 Processing job: ${job.name}`);

    switch (job.name) {
      case 'cancel-invoice':
        return await this.handleCancelInvoice(job);
      case 'cancel-subscription':
        return await this.handleCancelSubscription(job);
      case 'fail-payment':
        return await this.handleFailPayment(job);
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
        return { skipped: true, reason: 'Unknown job type' };
    }
  }

  async handleCancelInvoice(job: Job) {
    const { id } = job.data;
    this.logger.log(`Processing auto-cancel job for invoice ${id}`);

    try {
      const invoice = await this.invoiceRepository.findOne({
        where: { id },
        relations: ['billed_user'],
      });

      if (!invoice) {
        this.logger.warn(`Invoice ${id} not found, skipping auto-cancel`);
        return;
      }

      // Only cancel if still pending (might have been paid/failed manually)
      if (invoice.status === InvoiceStatus.PENDING) {
        invoice.status = InvoiceStatus.CANCELLED;
        await this.invoiceRepository.save(invoice);

        this.logger.log(
          `Invoice ${id} automatically marked as cancelled after timeout`,
        );

        return { success: true, id }; // explicit return

        // TODO: Send notification about auto-failure
        // await this.notificationsService.sendInvoiceAutoCancelledNotification(...);
      } else {
        this.logger.log(
          `Invoice ${id} already has status ${invoice.status}, skipping auto-cancel`,
        );
      }
      return { skipped: true, status: invoice.status }; // explicit return
    } catch (error) {
      this.logger.error(
        `Failed to process auto-cancel for invoice ${id}: ${error.message}`,
      );
      throw error;
    }
  }

  async handleCancelSubscription(job: Job) {
    const { id, type } = job.data;
    this.logger.log(`Processing auto-cancel job for subscription ${id}`);

    try {
      let subscription;
      if (type === 'subscription') {
        subscription = await this.memberSubscriptionRepository.findOne({
          where: { id },
        });
      } else if (type === 'org-subscription') {
        subscription = await this.organizationSubscriptionRepository.findOne({
          where: { id },
        });
      }

      if (!subscription) {
        this.logger.warn(`subscription ${id} not found, skipping auto-fail`);
        return;
      }

      // Only cancel if still pending (might have been paid/failed manually)
      if (subscription.status === SubscriptionStatus.PENDING) {
        subscription.status = SubscriptionStatus.CANCELLED;
        subscription.cancelled_at = new Date();
        if (type === 'subscription') {
          await this.memberSubscriptionRepository.save(subscription);
        } else {
          await this.organizationSubscriptionRepository.save(subscription);
        }

        this.logger.log(
          `Subscription ${id} automatically marked as cancelled after timeout`,
        );

        return { success: true, id }; // explicit return

        // TODO: Send notification about auto-failure
        // await this.notificationsService.sendSubscriptionAutoCancelledNotification(...);
      } else {
        this.logger.log(
          `Subscription ${id} already has status ${subscription.status}, skipping auto-cancel`,
        );
      }
      return { skipped: true, status: subscription.status }; // explicit return
    } catch (error) {
      this.logger.error(
        `Failed to process auto-cancel for subscription ${id}: ${error.message}`,
      );
      throw error;
    }
  }

  async handleFailPayment(job: Job) {
    const { id } = job.data;
    this.logger.log(`Processing auto-fail job for payment ${id}`);

    try {
      const payment = await this.paymentRepository.findOne({
        where: { id },
        relations: ['invoice', 'payer_user'],
      });

      if (!payment) {
        this.logger.warn(`Payment ${id} not found, skipping auto-fail`);
        return;
      }

      // Only fail if still pending
      if (payment.status === PaymentStatus.PENDING) {
        payment.status = PaymentStatus.FAILED;
        payment.metadata = {
          ...payment.metadata,
          failure_reason: 'Auto-failed after 10 minute timeout',
          auto_failed_at: new Date().toISOString(),
        };

        await this.paymentRepository.save(payment);

        // Also cancel the associated invoice if it's still pending
        if (payment.invoice?.status === InvoiceStatus.PENDING) {
          payment.invoice.status = InvoiceStatus.CANCELLED;
          await this.invoiceRepository.save(payment.invoice);

          this.logger.log(
            `Payment ${id} and associated invoice ${payment.invoice.id} automatically marked as failed/cancelled`,
          );
        } else {
          this.logger.log(
            `Payment ${id} automatically marked as failed after timeout`,
          );
        }

        return { success: true, id }; // explicit return

        // TODO: Send notification about auto-failure
        // await this.notificationsService.sendPaymentAutoFailedNotification(...);
      } else {
        this.logger.log(
          `Payment ${id} already has status ${payment.status}, skipping auto-fail`,
        );
      }
      return { skipped: true, status: payment.status }; // explicit return
    } catch (error) {
      this.logger.error(
        `Failed to process auto-fail for payment ${id}: ${error.message}`,
      );
      throw error;
    }
  }
}
