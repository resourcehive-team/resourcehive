import { InternalServerErrorException } from '@nestjs/common';
import { NotificationClientService } from '@resourcehive/notification-client';
import nodemailer from 'nodemailer';
import { EmailService } from './email.service';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}));

describe('EmailService', () => {
  const sendVerificationEmail = jest.fn();
  const notifications = {
    sendVerificationEmail,
  } as unknown as NotificationClientService;
  const service = new EmailService(notifications);
  const originalEnvironment = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnvironment };
    jest.clearAllMocks();
  });

  it('publishes verification email and returns the link in development', async () => {
    process.env.NODE_ENV = 'development';
    process.env.APP_URL = 'http://localhost:3000';
    sendVerificationEmail.mockResolvedValue({});

    await expect(
      service.sendVerificationEmail(
        '11111111-1111-4111-8111-111111111111',
        'alex@example.edu',
        'verification-token',
      ),
    ).resolves.toEqual({
      developmentVerificationUrl:
        'http://localhost:3000/verify-email?token=verification-token',
    });
    expect(sendVerificationEmail).toHaveBeenCalledWith({
      recipientUserId: '11111111-1111-4111-8111-111111111111',
      email: 'alex@example.edu',
      verificationUrl:
        'http://localhost:3000/verify-email?token=verification-token',
      correlationId: '11111111-1111-4111-8111-111111111111',
    });
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it('does not expose the verification link in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_URL = 'https://resourcehive.example';
    sendVerificationEmail.mockResolvedValue({});

    await expect(
      service.sendVerificationEmail(
        '11111111-1111-4111-8111-111111111111',
        'alex@example.edu',
        'verification-token',
      ),
    ).resolves.toEqual({});
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it('prints a trusted frontend password reset link for local development', async () => {
    process.env.EMAIL_TRANSPORT = 'console';
    process.env.APP_URL = 'http://localhost:3000';

    await expect(
      service.sendPasswordResetEmail('alex@example.edu', 'reset-token'),
    ).resolves.toBeUndefined();
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it('sends password reset and password changed messages through SMTP', async () => {
    const sendMail = jest
      .fn<
        Promise<{ messageId: string }>,
        [{ to: string; text: string; subject?: string; from?: string }]
      >()
      .mockResolvedValue({ messageId: 'message-id' });
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
    process.env.EMAIL_TRANSPORT = 'smtp';
    process.env.APP_URL = 'https://resourcehive.example';
    process.env.SMTP_HOST = 'smtp.example';
    process.env.SMTP_PORT = '587';

    await service.sendPasswordResetEmail('alex@example.edu', 'reset-token');
    await service.sendPasswordChangedEmail('alex@example.edu');

    const resetMessage = sendMail.mock.calls[0][0];
    expect(resetMessage.to).toBe('alex@example.edu');
    expect(resetMessage.subject).toBe('Reset your ResourceHive password');
    expect(resetMessage.text).toContain(
      'https://resourcehive.example/reset-password?token=reset-token',
    );
    const changedMessage = sendMail.mock.calls[1][0];
    expect(changedMessage.to).toBe('alex@example.edu');
    expect(changedMessage.subject).toBe(
      'Your ResourceHive password was changed',
    );
  });

  it('rejects an unsupported transport for password emails', async () => {
    process.env.EMAIL_TRANSPORT = 'unknown';

    await expect(
      service.sendPasswordResetEmail('alex@example.edu', 'reset-token'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
