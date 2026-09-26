import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { NotificationClientService } from '@resourcehive/notification-client';

export interface VerificationEmailResult {
  developmentVerificationUrl?: string;
}

@Injectable()
export class EmailService {
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

  async sendPasswordResetEmail(
    userId: string,
    email: string,
    token: string,
  ): Promise<void> {
    const resetUrl = this.createAppUrl('/reset-password', token);
    await this.notifications.sendPasswordResetEmail({
      recipientUserId: userId,
      email,
      resetUrl,
      correlationId: userId,
    });
  }

  async sendPasswordChangedEmail(userId: string, email: string): Promise<void> {
    await this.notifications.sendPasswordChangedEmail({
      recipientUserId: userId,
      email,
      correlationId: userId,
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
