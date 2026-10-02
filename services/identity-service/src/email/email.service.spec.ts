import { NotificationClientService } from '@resourcehive/notification-client';
import { EmailService } from './email.service';

describe('EmailService', () => {
  const sendVerificationEmail = jest.fn();
  const sendPasswordResetEmail = jest.fn();
  const sendPasswordChangedEmail = jest.fn();
  const notifications = {
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendPasswordChangedEmail,
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
  });

  it('publishes a password reset command with a trusted frontend link', async () => {
    process.env.APP_URL = 'http://localhost:3000';

    await expect(
      service.sendPasswordResetEmail(
        '11111111-1111-4111-8111-111111111111',
        'alex@example.edu',
        'reset-token',
      ),
    ).resolves.toBeUndefined();
    expect(sendPasswordResetEmail).toHaveBeenCalledWith({
      recipientUserId: '11111111-1111-4111-8111-111111111111',
      email: 'alex@example.edu',
      resetUrl: 'http://localhost:3000/reset-password?token=reset-token',
      correlationId: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('publishes password changed confirmation through Notification Service', async () => {
    await expect(
      service.sendPasswordChangedEmail(
        '11111111-1111-4111-8111-111111111111',
        'alex@example.edu',
      ),
    ).resolves.toBeUndefined();
    expect(sendPasswordChangedEmail).toHaveBeenCalledWith({
      recipientUserId: '11111111-1111-4111-8111-111111111111',
      email: 'alex@example.edu',
      correlationId: '11111111-1111-4111-8111-111111111111',
    });
  });
});
