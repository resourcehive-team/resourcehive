import { InternalServerErrorException } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { EmailService } from './email.service';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}));

describe('EmailService', () => {
  const service = new EmailService();
  const originalEnvironment = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnvironment };
    jest.clearAllMocks();
  });

  it('returns the verification link when using the console transport', async () => {
    process.env.EMAIL_TRANSPORT = 'console';
    process.env.APP_URL = 'http://localhost:3000';

    await expect(
      service.sendVerificationEmail('alex@example.edu', 'verification-token'),
    ).resolves.toEqual({
      developmentVerificationUrl:
        'http://localhost:3000/verify-email?token=verification-token',
    });
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it('sends the verification link through SMTP without returning it', async () => {
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
    process.env.SMTP_USER = 'smtp-user';
    process.env.SMTP_PASSWORD = 'smtp-password';

    await expect(
      service.sendVerificationEmail('alex@example.edu', 'verification-token'),
    ).resolves.toEqual({});
    const message = sendMail.mock.calls[0][0] as {
      to: string;
      text: string;
    };
    expect(message.to).toBe('alex@example.edu');
    expect(message.text).toContain(
      'https://resourcehive.example/verify-email?token=verification-token',
    );
  });

  it('rejects an unsupported email transport', async () => {
    process.env.EMAIL_TRANSPORT = 'unknown';

    await expect(
      service.sendVerificationEmail('alex@example.edu', 'verification-token'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
