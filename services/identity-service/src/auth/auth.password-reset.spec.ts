import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@resourcehive/database';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import { EmailService } from '../email/email.service';
import { AuthService } from './auth.service';

interface CreatePasswordResetTokenRequest {
  data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  };
}

interface UpdateUserPasswordRequest {
  data: {
    passwordHash: string;
  };
}

interface UpdatePasswordResetTokensRequest {
  where: {
    id?: string;
    userId?: string;
    usedAt: null;
    expiresAt: { gt: Date };
  };
  data: { usedAt: Date };
}

interface RevokeRefreshTokensRequest {
  where: { userId: string; revokedAt: null };
  data: { revokedAt: Date };
}

describe('AuthService password reset', () => {
  const user = {
    findUnique: jest.fn(),
  };
  const passwordResetToken = {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  };
  const transactionPasswordResetToken = {
    create: jest.fn<
      Promise<{ id: string }>,
      [CreatePasswordResetTokenRequest]
    >(),
    updateMany: jest.fn<
      Promise<{ count: number }>,
      [UpdatePasswordResetTokensRequest]
    >(),
  };
  const transactionUser = {
    update: jest.fn<Promise<{ id: string }>, [UpdateUserPasswordRequest]>(),
  };
  const transactionRefreshToken = {
    updateMany: jest
      .fn<Promise<{ count: number }>, [RevokeRefreshTokensRequest]>()
      .mockResolvedValue({ count: 0 }),
  };
  const transaction = {
    passwordResetToken: transactionPasswordResetToken,
    refreshToken: transactionRefreshToken,
    user: transactionUser,
  };
  const runTransaction = jest.fn(
    async (callback: (client: typeof transaction) => Promise<unknown>) =>
      callback(transaction),
  );
  const prisma = {
    user,
    passwordResetToken,
    $transaction: runTransaction,
  } as unknown as PrismaService;
  const sendPasswordResetEmail = jest.fn<Promise<void>, [string, string]>();
  const sendPasswordChangedEmail = jest.fn<Promise<void>, [string]>();
  const emailService = {
    sendPasswordResetEmail,
    sendPasswordChangedEmail,
  } as unknown as EmailService;
  const service = new AuthService(prisma, new JwtService(), emailService);
  const originalBcryptRounds = process.env.BCRYPT_ROUNDS;
  const originalResetLifetime = process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN;

  beforeAll(() => {
    process.env.BCRYPT_ROUNDS = '4';
    process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN = '1h';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    user.findUnique.mockResolvedValue({
      id: 'user-id',
      email: 'alex@example.edu',
      status: 'ACTIVE',
      emailVerifiedAt: new Date('2026-08-01T00:00:00.000Z'),
    });
    passwordResetToken.findFirst.mockResolvedValue(null);
    transactionPasswordResetToken.updateMany.mockResolvedValue({ count: 0 });
    transactionPasswordResetToken.create.mockResolvedValue({ id: 'token-id' });
    transactionUser.update.mockResolvedValue({ id: 'user-id' });
    transactionRefreshToken.updateMany.mockResolvedValue({ count: 0 });
    sendPasswordResetEmail.mockResolvedValue(undefined);
    sendPasswordChangedEmail.mockResolvedValue(undefined);
  });

  afterAll(() => {
    if (originalBcryptRounds === undefined) {
      delete process.env.BCRYPT_ROUNDS;
    } else {
      process.env.BCRYPT_ROUNDS = originalBcryptRounds;
    }
    if (originalResetLifetime === undefined) {
      delete process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN;
    } else {
      process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN = originalResetLifetime;
    }
  });

  it('stores a token hash and emails only the raw reset token', async () => {
    const result = await service.requestPasswordReset({
      email: ' Alex@Example.EDU ',
    });

    expect(user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'alex@example.edu' } }),
    );
    const createRequest = transactionPasswordResetToken.create.mock.calls[0][0];
    const emailedToken = sendPasswordResetEmail.mock.calls[0][1];
    expect(emailedToken.length).toBeGreaterThanOrEqual(40);
    expect(createRequest.data.tokenHash).toBe(
      createHash('sha256').update(emailedToken).digest('hex'),
    );
    expect(createRequest.data.tokenHash).not.toBe(emailedToken);
    expect(createRequest.data.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(result.message).toContain('If an account exists');
  });

  it('returns the same response without sending email for an unknown user', async () => {
    user.findUnique.mockResolvedValue(null);

    const result = await service.requestPasswordReset({
      email: 'missing@example.edu',
    });

    expect(result.message).toContain('If an account exists');
    expect(runTransaction).not.toHaveBeenCalled();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('does not issue another token during the request cooldown', async () => {
    passwordResetToken.findFirst.mockResolvedValue({ createdAt: new Date() });

    await service.requestPasswordReset({ email: 'alex@example.edu' });

    expect(runTransaction).not.toHaveBeenCalled();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('claims a valid token and changes the password atomically', async () => {
    const oldPasswordHash = await bcrypt.hash('OldPassword123!', 4);
    passwordResetToken.findUnique.mockResolvedValue({
      id: 'token-id',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: 'user-id',
        email: 'alex@example.edu',
        passwordHash: oldPasswordHash,
        status: 'ACTIVE',
        emailVerifiedAt: new Date('2026-08-01T00:00:00.000Z'),
      },
    });
    transactionPasswordResetToken.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const result = await service.resetPassword({
      token: 'valid-password-reset-token',
      password: 'NewPassword123!',
    });

    const claimRequest =
      transactionPasswordResetToken.updateMany.mock.calls[0][0];
    expect(claimRequest.where.id).toBe('token-id');
    expect(claimRequest.where.usedAt).toBeNull();
    const passwordUpdate = transactionUser.update.mock.calls[0][0];
    await expect(
      bcrypt.compare('NewPassword123!', passwordUpdate.data.passwordHash),
    ).resolves.toBe(true);
    expect(sendPasswordChangedEmail).toHaveBeenCalledWith('alex@example.edu');
    const refreshRevocation =
      transactionRefreshToken.updateMany.mock.calls[0][0];
    expect(refreshRevocation.where).toEqual({
      userId: 'user-id',
      revokedAt: null,
    });
    expect(refreshRevocation.data.revokedAt).toBeInstanceOf(Date);
    expect(result.message).toContain('Password reset successfully');
  });

  it.each([
    ['unknown', null],
    [
      'expired',
      {
        id: 'token-id',
        usedAt: null,
        expiresAt: new Date(Date.now() - 60_000),
        user: {
          id: 'user-id',
          email: 'alex@example.edu',
          passwordHash: 'unused-hash',
          status: 'ACTIVE',
          emailVerifiedAt: new Date('2026-08-01T00:00:00.000Z'),
        },
      },
    ],
    [
      'used',
      {
        id: 'token-id',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
        user: {
          id: 'user-id',
          email: 'alex@example.edu',
          passwordHash: 'unused-hash',
          status: 'ACTIVE',
          emailVerifiedAt: new Date('2026-08-01T00:00:00.000Z'),
        },
      },
    ],
  ])('rejects an %s token', async (_case, storedToken) => {
    passwordResetToken.findUnique.mockResolvedValue(storedToken);

    await expect(
      service.resetPassword({
        token: 'unknown-password-reset-token',
        password: 'NewPassword123!',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(runTransaction).not.toHaveBeenCalled();
  });

  it('rejects reusing the current password', async () => {
    const passwordHash = await bcrypt.hash('SamePassword123!', 4);
    passwordResetToken.findUnique.mockResolvedValue({
      id: 'token-id',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: 'user-id',
        email: 'alex@example.edu',
        passwordHash,
        status: 'ACTIVE',
        emailVerifiedAt: new Date('2026-08-01T00:00:00.000Z'),
      },
    });

    await expect(
      service.resetPassword({
        token: 'valid-password-reset-token',
        password: 'SamePassword123!',
      }),
    ).rejects.toThrow('New password must be different');
    expect(runTransaction).not.toHaveBeenCalled();
  });
});
