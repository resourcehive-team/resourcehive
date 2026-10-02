import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@resourcehive/database';
import { createHash } from 'node:crypto';
import { EmailService } from '../email/email.service';
import { AuthService } from './auth.service';

interface CreateVerificationTokenRequest {
  data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  };
}

interface UpdateVerificationTokensRequest {
  where: {
    userId: string;
    usedAt: null;
    expiresAt: { gt: Date };
  };
  data: { usedAt: Date };
}

describe('AuthService resend verification', () => {
  const user = { findUnique: jest.fn() };
  const emailVerificationToken = { findFirst: jest.fn() };
  const transactionEmailVerificationToken = {
    create: jest.fn<
      Promise<{ id: string }>,
      [CreateVerificationTokenRequest]
    >(),
    updateMany: jest.fn<
      Promise<{ count: number }>,
      [UpdateVerificationTokensRequest]
    >(),
  };
  const transaction = {
    emailVerificationToken: transactionEmailVerificationToken,
  };
  const runTransaction = jest.fn(
    async (callback: (client: typeof transaction) => Promise<unknown>) =>
      callback(transaction),
  );
  const prisma = {
    user,
    emailVerificationToken,
    $transaction: runTransaction,
  } as unknown as PrismaService;
  const sendVerificationEmail = jest.fn<
    Promise<{ developmentVerificationUrl?: string }>,
    [string, string, string]
  >();
  const emailService = {
    sendVerificationEmail,
  } as unknown as EmailService;
  const service = new AuthService(prisma, new JwtService(), emailService);
  const responseMessage =
    'If an unverified account exists for that email, a verification link has been sent.';

  beforeEach(() => {
    jest.clearAllMocks();
    user.findUnique.mockResolvedValue({
      id: 'user-id',
      email: 'alex@example.edu',
      status: 'ACTIVE',
      emailVerifiedAt: null,
    });
    emailVerificationToken.findFirst.mockResolvedValue(null);
    transactionEmailVerificationToken.updateMany.mockResolvedValue({
      count: 1,
    });
    transactionEmailVerificationToken.create.mockResolvedValue({
      id: 'token-id',
    });
    sendVerificationEmail.mockResolvedValue({
      developmentVerificationUrl: 'development-url',
    });
  });

  it('invalidates active links and emails a newly hashed token', async () => {
    const result = await service.resendVerificationEmail({
      email: ' Alex@Example.EDU ',
    });

    expect(user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'alex@example.edu' } }),
    );
    const createRequest =
      transactionEmailVerificationToken.create.mock.calls[0][0];
    const emailedToken = sendVerificationEmail.mock.calls[0][2];
    expect(sendVerificationEmail.mock.calls[0][0]).toBe('user-id');
    expect(createRequest.data.tokenHash).toBe(
      createHash('sha256').update(emailedToken).digest('hex'),
    );
    expect(createRequest.data.tokenHash).not.toBe(emailedToken);
    expect(createRequest.data.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(transactionEmailVerificationToken.updateMany).toHaveBeenCalled();
    expect(result).toEqual({ message: responseMessage });
    expect(result).not.toHaveProperty('developmentVerificationUrl');
  });

  it.each([
    ['unknown', null],
    [
      'verified',
      {
        id: 'user-id',
        email: 'alex@example.edu',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    ],
  ])('returns the same response for an %s account', async (_label, account) => {
    user.findUnique.mockResolvedValue(account);

    const result = await service.resendVerificationEmail({
      email: 'alex@example.edu',
    });

    expect(result).toEqual({ message: responseMessage });
    expect(runTransaction).not.toHaveBeenCalled();
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it('does not issue another link during the request cooldown', async () => {
    emailVerificationToken.findFirst.mockResolvedValue({
      createdAt: new Date(),
    });

    const result = await service.resendVerificationEmail({
      email: 'alex@example.edu',
    });

    expect(result).toEqual({ message: responseMessage });
    expect(runTransaction).not.toHaveBeenCalled();
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });
});
