import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectQueue, getQueueToken } from '@nestjs/bull';
import { type Queue } from 'bull';

@Injectable()
export class AutoFailQueueService {
  private readonly logger = new Logger(AutoFailQueueService.name);
  private readonly AUTO_FAIL_DELAY_MS = 10 * 60 * 1000; // 10 minutes

  constructor(
    @Inject(getQueueToken('auto-fail')) private autoFailQueue: Queue,
  ) {}

  async scheduleInvoiceAutoCancel(invoiceId: string) {
    try {
      this.logger.log(
        `Scheduling auto-cancel for invoice ${invoiceId} in 10 minutes`,
      );

      await this.autoFailQueue.add(
        'cancel-invoice',
        { type: 'invoice', id: invoiceId },
        {
          delay: this.AUTO_FAIL_DELAY_MS,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to schedule auto-cancel for invoice ${invoiceId}: ${error.message}`,
      );
    }
  }

  async schedulePaymentAutoFail(paymentId: string) {
    try {
      this.logger.log(
        `Scheduling auto-fail for payment ${paymentId} in 10 minutes`,
      );

      await this.autoFailQueue.add(
        'fail-payment',
        { type: 'payment', id: paymentId },
        {
          delay: this.AUTO_FAIL_DELAY_MS,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to schedule auto-fail for payment ${paymentId}: ${error.message}`,
      );
    }
  }

  async scheduleSubscriptionAutoCancel(subscriptionId: string) {
    try {
      this.logger.log(
        `Scheduling auto-cancel for subscription ${subscriptionId} in 10 minutes`,
      );

      await this.autoFailQueue.add(
        'cancel-subscription',
        { type: 'subscription', id: subscriptionId },
        {
          delay: this.AUTO_FAIL_DELAY_MS,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to schedule auto-cancel for subscription ${subscriptionId}: ${error.message}`,
      );
    }
  }

  async scheduleOrgSubscriptionAutoCancel(subscriptionId: string) {
    try {
      this.logger.log(
        `Scheduling auto-cancel for org subscription ${subscriptionId} in 10 minutes`,
      );

      await this.autoFailQueue.add(
        'cancel-subscription',
        { type: 'org-subscription', id: subscriptionId },
        {
          delay: this.AUTO_FAIL_DELAY_MS,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to schedule auto-cancel for org subscription ${subscriptionId}: ${error.message}`,
      );
    }
  }

  async removeScheduledInvoiceCancel(invoiceId: string) {
    try {
      const jobs = await this.autoFailQueue.getWaiting();
      const jobsToRemove = jobs.filter(
        (job) => job.data.type === 'invoice' && job.data.id === invoiceId,
      );

      for (const job of jobsToRemove) {
        await job.remove();
        this.logger.log(`Removed scheduled auto-fail for invoice ${invoiceId}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to remove scheduled auto-fail for invoice ${invoiceId}: ${error.message}`,
      );
    }
  }

  async removeScheduledPaymentFail(paymentId: string) {
    try {
      const jobs = await this.autoFailQueue.getWaiting();
      const jobsToRemove = jobs.filter(
        (job) => job.data.type === 'payment' && job.data.id === paymentId,
      );

      for (const job of jobsToRemove) {
        await job.remove();
        this.logger.log(`Removed scheduled auto-fail for payment ${paymentId}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to remove scheduled auto-fail for payment ${paymentId}: ${error.message}`,
      );
    }
  }

  async removeScheduledSubscriptionCancel(subscriptionId: string) {
    try {
      const jobs = await this.autoFailQueue.getWaiting();
      const jobsToRemove = jobs.filter(
        (job) =>
          job.data.type === 'subscription' && job.data.id === subscriptionId,
      );

      for (const job of jobsToRemove) {
        await job.remove();
        this.logger.log(
          `Removed scheduled auto-cancel for subscripption ${subscriptionId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to remove scheduled auto-cancel for subscripption ${subscriptionId}: ${error.message}`,
      );
    }
  }

  async removeScheduledOrgSubscriptionCancel(subscriptionId: string) {
    try {
      const jobs = await this.autoFailQueue.getWaiting();
      const jobsToRemove = jobs.filter(
        (job) =>
          job.data.type === 'org-subscription' &&
          job.data.id === subscriptionId,
      );

      for (const job of jobsToRemove) {
        await job.remove();
        this.logger.log(
          `Removed scheduled auto-cancel for org subscription ${subscriptionId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to remove scheduled auto-cancel for org subscription ${subscriptionId}: ${error.message}`,
      );
    }
  }
}
