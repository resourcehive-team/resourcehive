import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { NotificationClientService } from '@resourcehive/notification-client';
import nodemailer from 'nodemailer';

export interface VerificationEmailResult {
  developmentVerificationUrl?: string;
}

interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly notifications: NotificationClientService) {}

  async sendVerificationEmail(
    userId: string,
    email: string,
    token: string,
  ): Promise<VerificationEmailResult> {
    const verificationUrl = this.createAppUrl('/verify-email', token);
    await this.notifications.sendVerificationEmail({
      recipientUserId: userId,
      email,
      verificationUrl,
      correlationId: userId,
    });

    return process.env.NODE_ENV === 'production'
      ? {}
      : { developmentVerificationUrl: verificationUrl };
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = this.createAppUrl('/reset-password', token);

    if ((process.env.EMAIL_TRANSPORT ?? 'console') === 'console') {
      this.logger.log(`Password reset email for ${email}: ${resetUrl}`);
      return;
    }

    await this.sendSmtpEmail({
      to: email,
      subject: 'Reset your ResourceHive password',
      text: `Reset your password by opening this link: ${resetUrl}\n\nIf you did not request this change, you can ignore this email.`,
    });
  }

  async sendPasswordChangedEmail(email: string): Promise<void> {
    const text =
      'Your ResourceHive password was changed. If you did not make this change, contact your organization administrator.';

    if ((process.env.EMAIL_TRANSPORT ?? 'console') === 'console') {
      this.logger.log(`Password changed email for ${email}: ${text}`);
      return;
    }

    await this.sendSmtpEmail({
      to: email,
      subject: 'Your ResourceHive password was changed',
      text,
    });
  }

  private async sendSmtpEmail(message: EmailMessage): Promise<void> {
    if (process.env.EMAIL_TRANSPORT !== 'smtp') {
      throw new InternalServerErrorException(
        'EMAIL_TRANSPORT must be console or smtp',
      );
    }

    const smtpPort = Number(process.env.SMTP_PORT ?? 587);
    if (!process.env.SMTP_HOST || !Number.isInteger(smtpPort)) {
      throw new InternalServerErrorException(
        'SMTP_HOST and a valid SMTP_PORT are required for SMTP email',
      );
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: process.env.SMTP_SECURE === 'true',
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASSWORD
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD,
            }
          : undefined,
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? 'ResourceHive <no-reply@localhost>',
      ...message,
    });
  }

  private createAppUrl(path: string, token: string): string {
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    let targetUrl: URL;

    try {
      targetUrl = new URL(path, appUrl);
    } catch {
      throw new InternalServerErrorException('APP_URL must be a valid URL');
    }

    targetUrl.searchParams.set('token', token);
    return targetUrl.toString();
  }
}
