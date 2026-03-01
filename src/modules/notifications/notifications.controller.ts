import { Controller, Post, Body, Logger, Get, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';
import { type EmailOptions } from './interfaces/notification.interface';
import { SendCustomEmailDto } from './dto/send-custom-email.dto';
import { CurrentOrganization } from 'src/common/decorators/organization.decorator';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
// import { type SmsOptions } from './interfaces/notification.interface';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  @Get('test-email')
  @ApiOperation({ summary: 'Test email configuration' })
  async testEmail() {
    const testEmail = this.configService.get('smtp.fromEmail');
    const testRecipient = 'elijah.usih@stu.cu.edu.ng';

    try {
      const result = await this.emailService.sendEmail({
        to: testRecipient,
        subject: 'Test Email from ReeTrack',
        template: 'test',
        context: { test: true },
      });

      this.logger.log(`Test email sent to ${testRecipient}`);
      return {
        success: result,
        message: result
          ? 'Test email sent successfully'
          : 'Failed to send test email',
        testEmail,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Test email failed', error.stack);
      return {
        success: false,
        message: 'Failed to send test email',
        error: error.message,
        testEmail,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('email/welcome')
  @ApiOperation({ summary: 'Send a welcome email' })
  @ApiResponse({ status: 200, description: 'Emails sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        to: {
          type: 'array',
          items: { type: 'string', format: 'email' },
          example: [
            'user1@example.com',
            'user2@example.com',
            'user3@example.com',
          ],
        },
        subject: {
          type: 'string',
          example: 'Important Update About Your Subscription',
        },
        context: {
          type: 'object',
          example: {
            content:
              'Hello, this is a custom email with important information.',
            additionalNotes: 'Please review the attached documents.',
          },
        },
      },
      required: ['to', 'subject', 'context'],
    },
  })
  async sendWelcomeEmail(@Body() emailOptions: EmailOptions) {
    this.logger.log('Sending welcome email');
    try {
      await this.notificationsService.sendWelcomeEmail({
        email: emailOptions.to,
        userName: emailOptions.context?.userName || 'User',
        organizationName: emailOptions.context?.organizationName || 'ReeTrack',
      });
      return { success: true, message: 'Welcome email sent successfully' };
    } catch (error) {
      this.logger.error('Failed to send welcome email', error.stack);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('email/custom')
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @ApiOperation({ summary: 'Send custom email to multiple recipients' })
  @ApiResponse({
    status: 200,
    description: 'Emails sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Custom emails processed',
        },
        results: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 3 },
            success: { type: 'number', example: 2 },
            failed: { type: 'number', example: 1 },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  email: { type: 'string', example: 'user3@example.com' },
                  error: { type: 'string', example: 'SMTP server unavailable' },
                },
              },
              example: [
                {
                  email: 'user3@example.com',
                  error: 'SMTP server unavailable',
                },
              ],
            },
          },
        },
      },
    },
  })
  async sendCustomEmail(
    @CurrentOrganization() organizationId: string,
    @Body() sendCustomEmailDto: SendCustomEmailDto,
  ) {
    this.logger.log(
      `Sending custom email to ${sendCustomEmailDto.to.length} recipients`,
    );

    const results = await this.notificationsService.sendCustomEmail({
      organizationId,
      to: sendCustomEmailDto.to,
      subject: sendCustomEmailDto.subject,
      template: 'custom_email',
      context: sendCustomEmailDto.context,
    });

    return {
      message: 'Custom emails processed',
      results: {
        total: sendCustomEmailDto.to.length,
        success: results.success,
        failed: results.failed,
        errors: results.errors,
      },
    };
  }

  //   @Post('sms/test')
  //   @ApiOperation({ summary: 'Send a test SMS' })
  //   @ApiResponse({ status: 200, description: 'SMS sent successfully' })
  //   @ApiResponse({ status: 400, description: 'Bad Request' })
  //   async sendTestSms(@Body() smsOptions: SmsOptions) {
  //     this.logger.log('Sending test SMS');
  //     try {
  //       await this.notificationsService.sendSms({
  //         to: smsOptions.to,
  //         message: smsOptions.message || 'This is a test SMS from ReeTrack',
  //       });
  //       return { success: true, message: 'Test SMS sent successfully' };
  //     } catch (error) {
  //       this.logger.error('Failed to send test SMS', error.stack);
  //       throw error;
  //     }
  //   }

  //   @Post('payment/success')
  //   @ApiOperation({ summary: 'Send payment success notification' })
  //   async sendPaymentSuccess(
  //     @Body()
  //     body: {
  //       email: string;
  //       amount: number;
  //       reference: string;
  //       date: string;
  //     },
  //   ) {
  //     return this.notificationsService.sendPaymentSuccess({
  //       email: body.email,
  //       amount: body.amount,
  //       reference: body.reference,
  //       date: new Date(body.date),
  //     });
  //   }

  //   @Post('payment/failed')
  //   @ApiOperation({ summary: 'Send payment failure notification' })
  //   async sendPaymentFailed(
  //     @Body()
  //     body: {
  //       email: string;
  //       amount: number;
  //       reason: string;
  //       retryUrl: string;
  //     },
  //   ) {
  //     return this.notificationsService.sendPaymentFailed({
  //       email: body.email,
  //       amount: body.amount,
  //       reason: body.reason,
  //       retryUrl: body.retryUrl,
  //     });
  //   }
}
