import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import nodemailer from 'nodemailer';

export interface VerificationEmailResult {
  developmentVerificationUrl?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendVerificationEmail(
    email: string,
    token: string,
  ): Promise<VerificationEmailResult> {
    const verificationUrl = this.createVerificationUrl(token);
    const transport = process.env.EMAIL_TRANSPORT ?? 'console';

    if (transport === 'console') {
      this.logger.log(`Verification email for ${email}: ${verificationUrl}`);
      return { developmentVerificationUrl: verificationUrl };
    }

    if (transport !== 'smtp') {
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
      to: email,
      subject: 'Verify your ResourceHive email',
      text: `Verify your email by opening this link: ${verificationUrl}`,
    });

    return {};
  }

  private createVerificationUrl(token: string): string {
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    let verificationUrl: URL;

    try {
      verificationUrl = new URL('/verify-email', appUrl);
    } catch {
      throw new InternalServerErrorException('APP_URL must be a valid URL');
    }

    verificationUrl.searchParams.set('token', token);
    return verificationUrl.toString();
  }
}
