import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailOptions } from './interfaces/notification.interface';

interface BrevoEmailPayload {
  sender: { name: string; email: string };
  to: { email: string }[];
  replyTo?: { email: string };
  subject: string;
  htmlContent: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly brevoApiUrl = 'https://api.brevo.com/v3/smtp/email';
  private readonly apiKey: string;
  private readonly fromName: string;
  private readonly fromEmail: string;
  private readonly replyToEmail: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('smtp.apiKey') || '';
    this.fromName =
      this.configService.get<string>('smtp.fromName') || 'ReeTrack';
    this.fromEmail = this.configService.get<string>('smtp.fromEmail') || '';
    this.replyToEmail =
      this.configService.get<string>('smtp.replyToEmail') || '';

    // Verify config on startup
    // if (!this.apiKey) {
    //   this.logger.error(
    //     '❌ BREVO_API_KEY is not set. Emails will not be sent.',
    //   );
    // } else {
    //   this.logger.log('✅ Brevo email service initialized');
    // }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const html = this.getEmailTemplate(options.template, options.context);

      const payload: BrevoEmailPayload = {
        sender: {
          name: this.fromName,
          email: this.fromEmail,
        },
        to: [{ email: options.to }],
        subject: options.subject,
        htmlContent: html,
      };

      if (this.replyToEmail) {
        payload.replyTo = { email: this.replyToEmail };
      }

      const response = await fetch(this.brevoApiUrl, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': this.apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        this.logger.error(
          `Failed to send email to ${options.to}: [${response.status}] ${JSON.stringify(errorBody)}`,
        );
        return false;
      }

      this.logger.log(`✅ Email sent to ${options.to}: ${options.subject}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${options.to}:`,
        error.message,
      );
      return false;
    }
  }

  private getEmailTemplate(
    template: string,
    context: Record<string, any>,
  ): string {
    const templates = {
      payment_success: this.paymentSuccessTemplate(context),
      payment_failed: this.paymentFailedTemplate(context),
      payment_reminder: this.paymentReminderTemplate(context),
      subscription_created: this.subscriptionCreatedTemplate(context),
      subscription_expiring: this.subscriptionExpiringTemplate(context),
      subscription_expired: this.subscriptionExpiredTemplate(context),
      renewal_failed: this.renewalFailedTemplate(context),
      invoice_created: this.invoiceCreatedTemplate(context),
      invoice_overdue: this.invoiceOverdueTemplate(context),
      welcome_email: this.welcomeEmailTemplate(context),
      register_member_email: this.registerMemberEmailTemplate(context),
      register_staff_email: this.registerStaffEmailTemplate(context),
      register_organization_email:
        this.registerOrganizationEmailTemplate(context),
      custom_email: this.customEmailTemplate(context),
      password_reset: this.passwordResetEmailTemplate(context),
      email_verification_otp: this.otpEmailTemplate(context),
      email_verified: this.verifiedEmailTemplate(context),
      subscription_cancelled: this.subscriptionCancelledTemplate(context),
    };

    return templates[template] || this.defaultTemplate(context);
  }

  private welcomeEmailTemplate(context: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to ${context.organizationName}!</h1>
          </div>
          <div class="content">
            <p>Hi ${context.userName},</p>
            <p>Welcome! Your account has been created successfully.</p>
            <p>You can now start managing your subscriptions.</p>
          </div>
          <div class="footer">
            <p>This is an automated email from ReeTrack</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private registerOrganizationEmailTemplate(context: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
            .logo { font-size: 24px; font-weight: bold; color: #4CAF50; margin-bottom: 10px; }
            .content { background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #e9ecef; }
            .button { 
                display: inline-block; 
                padding: 12px 24px; 
                background-color: #4CAF50; 
                color: white; 
                text-decoration: none; 
                border-radius: 4px; 
                margin: 20px 0; 
            }
            .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
            .info-box { background-color: #f1f8ff; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">ReeTrack</div>
                <p>Your Organization Management Platform</p>
            </div>
            
            <div class="content">
                <h2>Welcome to ReeTrack! 🎉</h2>
                <p>Hello <strong>${context.userName || 'Administrator'}</strong>,</p>
                <p>Congratulations! Your organization <strong>${context.organizationName}</strong> has been successfully registered on ReeTrack.</p>
                
                <div class="info-box">
                    <p><strong>Organization Details:</strong></p>
                    <ul>
                        <li>Organization Name: ${context.organizationName}</li>
                        <li>Admin Email: ${context.userEmail}</li>
                        <li>Plan: BASIC</li>
                    </ul>
                </div>
                
                <p>Your organization is now ready to use! You can:</p>
                <ul>
                    <li>Add and manage members</li>
                    <li>Create subscription plans</li>
                    <li>Track payments and subscriptions</li>
                    <li>Generate reports</li>
                </ul>
                
                <p>Get started by clicking the button below:</p>
                <a href="${context.loginUrl}" class="button">Go to Dashboard</a>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">${context.loginUrl}</p>
                
                <p><strong>Need help?</strong> Check out our documentation or contact our support team.</p>
            </div>
            
            <div class="footer">
                <p>This is an automated email from ReeTrack</p>
                <p>© 2026 ReeTrack. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private registerMemberEmailTemplate(context: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { 
                display: inline-block; 
                padding: 12px 24px; 
                background-color: #4CAF50; 
                color: white; 
                text-decoration: none; 
                border-radius: 4px; 
                margin: 15px 0; 
            }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Welcome to ${context.organizationName}!</h2>
            <p>Hello ${context.userName || ''},</p>
            <p>You've been invited to join ${context.organizationName} as a member.</p>
            
            <p>Please click the button below to create your account and get started:</p>
            <a href="${context.registrationUrl}" class="button">Create Account</a>

            <p>Or copy and paste this link into your browser:</p>
            <p>${context.registrationUrl}</p>
            
            <p>Please click the button below to join the organization:</p>
            <a href="${context.joinUrl}" class="button">Join Organization</a>
            
            <p>Or copy and paste this link into your browser:</p>
            <p>${context.joinUrl}</p>

            <p>If you didn't request this, you can safely ignore this email.</p>
            
            <div class="footer">
                <p>Best regards,<br>The ${context.organizationName} Team</p>
            </div>
        </div>
    </body>
    </html>`;
  }

  private registerStaffEmailTemplate(context: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .button { 
                  display: inline-block; 
                  padding: 12px 24px; 
                  background-color: #2563eb; 
                  color: white; 
                  text-decoration: none; 
                  border-radius: 4px; 
                  margin: 15px 0; 
              }
              .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
      </head>
      <body>
          <div class="container">
              <h2>Welcome to ${context.organizationName}'s Staff Team!</h2>
              <p>Hello ${context.userName || ''},</p>
              <p>You've been invited to join ${context.organizationName} as a staff member.</p>
            
              <p>Please click the button below to create your staff account and get started:</p>          
              <a href="${context.registrationUrl}" class="button">Create Account</a>

              <p>Or copy and paste this link into your browser:</p>
              <p>${context.registrationUrl}</p>
      
              <p>Please click the button below to join the organization as staff:</p>
              <a href="${context.joinUrl}" class="button">Join Organization</a>

              <p>Or copy and paste this link into your browser:</p>
              <p>${context.joinUrl}</p>

              <p>If you didn't request this, please contact your administrator immediately.</p>
              
              <div class="footer">
                  <p>Best regards,<br>The ${context.organizationName} Admin Team</p>
              </div>
          </div>
      </body>
      </html>
    `;
  }

  private customEmailTemplate(context: any): string {
    const { content = '', organization = {} } = context;

    const orgName = organization?.name || 'Our Organization';
    const website = organization?.website || '#';
    const address =
      organization?.address || '123 Organization St, City, Country';
    const email = organization?.email || 'contact@example.com';
    const phone = organization?.phone || '+234 803 143 4567';

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
        .content { padding: 20px 0; }
        .footer { 
          margin-top: 30px; 
          padding: 20px 0; 
          text-align: center; 
          font-size: 12px; 
          color: #666;
          border-top: 1px solid #eee;
        }
        .button {
          display: inline-block;
          padding: 10px 20px;
          margin: 20px 0;
          background-color: #4CAF50;
          color: white;
          text-decoration: none;
          border-radius: 4px;
        }
        .footer-links { margin-top: 10px; }
        .footer-links a { 
          color: #666; 
          text-decoration: none;
          margin: 0 10px;
        }
        @media only screen and (max-width: 600px) {
          .container { width: 100% !important; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${orgName}</h1>
        </div>
        
        <div class="content">
          ${content}
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${orgName}. All rights reserved.</p>
          <p>${address}</p>
          
          <div class="footer-links">
            ${website ? `<a href="${website}">Website</a> | ` : ''}
            ${email ? `<a href="mailto:${email}">Contact Us</a> | ` : ''}
            ${phone ? `<a href="tel:${phone.replace(/[^0-9+]/g, '')}">${phone}</a>` : ''}
          </div>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  private passwordResetEmailTemplate(context: any): string {
    const { resetToken, email, organization = {} } = context;

    const orgName = organization?.name || 'ReeTrack';
    const supportEmail = organization?.email || 'hello@reetrack.com';
    const logoUrl =
      organization?.logoUrl || 'https://www.reetrack.com/logo.png';

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; }
        .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eeeeee; }
        .logo { max-width: 180px; height: auto; margin-bottom: 20px; }
        .content { padding: 30px 20px; }
        .button {
          display: inline-block; padding: 12px 30px; margin: 25px 0;
          background-color: #4F46E5; color: #ffffff !important;
          text-decoration: none; border-radius: 6px; font-weight: 600;
        }
        .footer { margin-top: 30px; padding: 20px; text-align: center; font-size: 12px; color: #666666; border-top: 1px solid #eeeeee; }
        .note { background-color: #f8f9fa; padding: 15px; border-left: 4px solid #4F46E5; margin: 20px 0; font-size: 14px; color: #495057; }
        @media only screen and (max-width: 600px) {
          .container { width: 100% !important; }
          .button { width: 100% !important; box-sizing: border-box; }
        }
      </style>
    </head>
    <body style="background-color: #f3f4f6; padding: 20px 0;">
      <div class="container">
        <div class="header">
          ${logoUrl ? `<img src="${logoUrl}" alt="${orgName} Logo" class="logo">` : ''}
          <h1 style="color: #1f2937; margin: 10px 0;">Reset Your Password</h1>
        </div>
        
        <div class="content">
          <p>Hello,</p>
          <p>We received a request to reset the password for your ${orgName} account.</p>
          <p>Copy and paste this code into the password reset field:</p>
          <div style="word-break: break-all; color: #3b82f6; margin: 15px 0;">${resetToken}</div>
          
          <div class="note">
            If you didn't request this password reset, you can safely ignore this email.
          </div>
          
          <p>Thanks,<br>The ${orgName} Team</p>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${orgName}. All rights reserved.</p>
          <p>Contact support: <a href="mailto:${supportEmail}" style="color: #4F46E5; text-decoration: none;">${supportEmail}</a></p>
          <p style="margin-top: 10px; font-size: 11px; color: #9ca3af;">
            This email was sent to ${email}. If you believe you received this in error, please ignore it.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
  }

  private paymentSuccessTemplate(context: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .amount { font-size: 16px; font-weight: bold; color: #4CAF50; }
          .details { background: white; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Successful</h1>
          </div>
          <div class="content">
            <p>Hi ${context.memberName},</p>
            <p>Your payment has been processed successfully!</p>
            
            <div class="details">
              <p><strong>Amount Paid:</strong> <span class="amount">${context.currency} ${context.amount}</span></p>
              <p><strong>Reference:</strong> ${context.reference}</p>
              <p><strong>Date:</strong> ${new Date(context.paidAt).toLocaleString()}</p>
              <p><strong>Payment Method:</strong> ${context.channel}</p>
            </div>

            <p>Thank you for your payment!</p>
          </div>
          <div class="footer">
            <p>This is an automated email from ReeTrack</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private paymentFailedTemplate(context: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f44336; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Failed</h1>
          </div>
          <div class="content">
            <p>Hi ${context.memberName},</p>
            <p>Unfortunately, your payment could not be processed.</p>
            <p><strong>Reason:</strong> ${context.reason || 'Unknown error'}</p>
            <p>Please try again or contact support if the issue persists.</p>
          </div>
          <div class="footer">
            <p>This is an automated email from ReeTrack</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private paymentReminderTemplate(context: any): string {
    const {
      memberName,
      subscriptionName,
      amount,
      invoiceNumber,
      paymentUrl,
      dueDate,
    } = context;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Payment Reminder - ${subscriptionName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
          .content { padding: 20px 0; }
          .button {
            display: inline-block; padding: 10px 20px;
            background-color: #4CAF50; color: white !important;
            text-decoration: none; border-radius: 4px; margin: 15px 0;
          }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #777; text-align: center; }
          .details { background: #f9f9f9; padding: 15px; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Payment Reminder</h2>
          </div>
          <div class="content">
            <p>Hi ${memberName},</p>
            <p>This is a reminder that your payment for <strong>${subscriptionName}</strong> is due.</p>
            <div class="details">
              <p><strong>Invoice:</strong> ${invoiceNumber}</p>
              <p><strong>Amount:</strong> ${amount}</p>
              <p><strong>Due Date:</strong> ${dueDate}</p>
            </div>
            ${paymentUrl ? `<a href="${paymentUrl}" class="button">Pay Now</a>` : ''}
          </div>
          <div class="footer">
            <p>This is an automated email from ReeTrack</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private subscriptionCreatedTemplate(context: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .details { background: white; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>Subscription Created</h1></div>
          <div class="content">
            <p>Hi ${context.memberName},</p>
            <p>Your subscription has been created successfully.</p>
            <div class="details">
              <p><strong>Plan:</strong> ${context.planName}</p>
              <p><strong>Amount:</strong> ${context.currency} ${context.amount}</p>
              <p><strong>Start Date:</strong> ${context.startDate}</p>
              <p><strong>Next Billing:</strong> ${context.nextBillingDate}</p>
            </div>
          </div>
          <div class="footer"><p>This is an automated email from ReeTrack</p></div>
        </div>
      </body>
      </html>
    `;
  }

  private subscriptionExpiringTemplate(context: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #FF9800; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>Subscription Expiring Soon</h1></div>
          <div class="content">
            <p>Hi ${context.memberName},</p>
            <p>Your subscription <strong>${context.planName}</strong> will expire on <strong>${context.expiryDate}</strong>.</p>
            <p>Please renew to avoid interruption of service.</p>
          </div>
          <div class="footer"><p>This is an automated email from ReeTrack</p></div>
        </div>
      </body>
      </html>
    `;
  }

  private subscriptionExpiredTemplate(context: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f44336; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>Subscription Expired</h1></div>
          <div class="content">
            <p>Hi ${context.memberName},</p>
            <p>Your subscription <strong>${context.planName}</strong> has expired.</p>
            <p>Please renew your subscription to continue using our services.</p>
          </div>
          <div class="footer"><p>This is an automated email from ReeTrack</p></div>
        </div>
      </body>
      </html>
    `;
  }

  private subscriptionCancelledTemplate(context: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #9E9E9E; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>Subscription Cancelled</h1></div>
          <div class="content">
            <p>Hi ${context.memberName},</p>
            <p>Your subscription <strong>${context.planName}</strong> has been cancelled.</p>
            <p>You will continue to have access until <strong>${context.accessUntil}</strong>.</p>
            <p>We're sorry to see you go. If you change your mind, you can resubscribe at any time.</p>
          </div>
          <div class="footer"><p>This is an automated email from ReeTrack</p></div>
        </div>
      </body>
      </html>
    `;
  }

  private renewalFailedTemplate(context: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f44336; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>Subscription Renewal Failed</h1></div>
          <div class="content">
            <p>Hi ${context.memberName},</p>
            <p>We were unable to renew your subscription <strong>${context.planName}</strong>.</p>
            <p><strong>Reason:</strong> ${context.reason || 'Payment failed'}</p>
            <p>Please update your payment details to avoid service interruption.</p>
          </div>
          <div class="footer"><p>This is an automated email from ReeTrack</p></div>
        </div>
      </body>
      </html>
    `;
  }

  private invoiceCreatedTemplate(context: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3F51B5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .details { background: white; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>Invoice Created</h1></div>
          <div class="content">
            <p>Hi ${context.memberName},</p>
            <p>A new invoice has been created for your account.</p>
            <div class="details">
              <p><strong>Invoice #:</strong> ${context.invoiceNumber}</p>
              <p><strong>Amount:</strong> ${context.currency} ${context.amount}</p>
              <p><strong>Due Date:</strong> ${context.dueDate}</p>
            </div>
          </div>
          <div class="footer"><p>This is an automated email from ReeTrack</p></div>
        </div>
      </body>
      </html>
    `;
  }

  private invoiceOverdueTemplate(context: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f44336; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .details { background: white; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>Invoice Overdue</h1></div>
          <div class="content">
            <p>Hi ${context.memberName},</p>
            <p>Your invoice is overdue. Please make payment as soon as possible.</p>
            <div class="details">
              <p><strong>Invoice #:</strong> ${context.invoiceNumber}</p>
              <p><strong>Amount Due:</strong> ${context.currency} ${context.amount}</p>
              <p><strong>Due Date:</strong> ${context.dueDate}</p>
              <p><strong>Days Overdue:</strong> ${context.daysOverdue}</p>
            </div>
          </div>
          <div class="footer"><p>This is an automated email from ReeTrack</p></div>
        </div>
      </body>
      </html>
    `;
  }

  private otpEmailTemplate(context: any): string {
    const { userName, otp, expirationMinutes } = context;

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .content { padding: 40px 30px; }
        .otp-container { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
        .otp-code { font-size: 48px; font-weight: 700; color: white; letter-spacing: 12px; margin: 0; font-family: 'Courier New', monospace; }
        .info-box { background: #f0f4ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 20px; margin: 25px 0; }
        .security-note { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 20px; margin: 25px 0; }
        .footer { background: #f8fafc; padding: 30px; text-align: center; font-size: 14px; color: #64748b; border-top: 1px solid #e2e8f0; }
        @media only screen and (max-width: 600px) {
          .container { margin: 20px auto; border-radius: 0; }
          .header, .content, .footer { padding: 25px 20px; }
          .otp-code { font-size: 36px; letter-spacing: 8px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Email Verification</h1>
        </div>
        
        <div class="content">
          <p>Hello <strong>${userName || 'User'}</strong>,</p>
          
          <p>Thank you for signing up with ReeTrack! To complete your registration and verify your email address, please use the verification code below:</p>
          
          <div class="otp-container">
            <p class="otp-code">${otp}</p>
          </div>
          
          <div class="info-box">
            <p><strong>How to use this code:</strong></p>
            <ol style="margin: 10px 0; padding-left: 20px;">
              <li>Copy the 6-digit code above</li>
              <li>Return to the ReeTrack application</li>
              <li>Enter the code in the verification field</li>
              <li>Your email will be verified instantly</li>
            </ol>
          </div>
          
          <div class="security-note">
            <p><strong>🔒 Security Notice:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>This code will expire in <strong>${expirationMinutes} minutes</strong></li>
              <li>Never share this code with anyone</li>
              <li>ReeTrack staff will never ask for your verification code</li>
              <li>If you didn't request this, please ignore this email</li>
            </ul>
          </div>

          <div style="margin: 2px 0">
            <p>Go to https://reetrack.com/auth/verify-email to get OTP link</p>
          </div>
          
          <p>Having trouble? <a href="mailto:reetrack.inc@gmail.com" style="color: #667eea; text-decoration: none;">Contact our support team</a></p>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} ReeTrack. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
          <p style="margin-top: 10px; font-size: 12px;">
            If you believe you received this email in error, no action is required.
          </p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  private verifiedEmailTemplate(context: any): string {
    const { userName } = context;

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verified Successfully</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .content { padding: 40px 30px; }
        .success-icon { width: 80px; height: 80px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 30px; font-size: 40px; }
        .success-box { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 25px; margin: 30px 0; text-align: center; }
        .button { display: inline-block; padding: 15px 35px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 25px 0; }
        .next-steps { background: #f1f5f9; border-radius: 8px; padding: 25px; margin: 30px 0; }
        .next-steps h3 { margin-top: 0; color: #1e293b; }
        .next-steps ul { margin: 15px 0; padding-left: 20px; }
        .next-steps li { margin-bottom: 10px; color: #475569; }
        .footer { background: #f8fafc; padding: 30px; text-align: center; font-size: 14px; color: #64748b; border-top: 1px solid #e2e8f0; }
        @media only screen and (max-width: 600px) {
          .container { margin: 20px auto; border-radius: 0; }
          .header, .content, .footer { padding: 25px 20px; }
          .button { width: 100%; box-sizing: border-box; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Email Verified!</h1>
        </div>
        
        <div class="content">
          <div class="success-icon">✓</div>
          
          <h2 style="text-align: center; color: #1e293b; margin-bottom: 20px;">
            Welcome aboard, <strong>${userName || 'User'}</strong>!
          </h2>
          
          <div class="success-box">
            <p style="margin: 0; font-size: 18px; color: #065f46;">
              <strong>Your email address has been successfully verified.</strong>
            </p>
          </div>
          
          <p style="text-align: center; font-size: 16px; color: #475569; margin: 20px 0;">
            You now have full access to all ReeTrack features and can start managing your subscriptions with confidence.
          </p>
          
          <div style="text-align: center;">
            <a href="https://reetrack.com/auth/login" class="button">Proceed to Dashboard</a>
          </div>
          
          <div class="next-steps">
            <h3>🚀 What's Next?</h3>
            <ul>
              <li>Complete your profile setup</li>
              <li>Explore our subscription management features</li>
              <li>Create your first organization or join an existing one</li>
              <li>Set up your billing preferences</li>
            </ul>
          </div>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} ReeTrack. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
          <p style="margin-top: 10px; font-size: 12px;">
            If you didn't verify this email, please contact our security team immediately.
          </p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  private defaultTemplate(context: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <p>${context.message || 'You have a new notification from ReeTrack.'}</p>
          <div class="footer"><p>This is an automated email from ReeTrack</p></div>
        </div>
      </body>
      </html>
    `;
  }
}
