import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@resourcehive/database';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import { EmailService } from '../email/email.service';
import { AuthService } from './auth.service';

interface CreateRefreshTokenRequest {
  data: {
    userId: string;
    familyId: string;
    tokenHash: string;
    expiresAt: Date;
  };
}

interface UpdateRefreshTokensRequest {
  where: {
    id?: string;
    familyId?: string;
    usedAt?: null;
    revokedAt?: null;
    expiresAt?: { gt: Date };
  };
  data: {
    usedAt?: Date;
    revokedAt?: Date;
  };
}

describe('AuthService refresh sessions', () => {
  const user = { findUnique: jest.fn() };
  const membership = { findFirst: jest.fn() };
  const refreshToken = {
    create: jest.fn<Promise<{ id: string }>, [CreateRefreshTokenRequest]>(),
    findUnique: jest.fn(),
    updateMany: jest.fn<
      Promise<{ count: number }>,
      [UpdateRefreshTokensRequest]
    >(),
  };
  const transactionRefreshToken = {
    create: jest.fn<Promise<{ id: string }>, [CreateRefreshTokenRequest]>(),
    updateMany: jest.fn<
      Promise<{ count: number }>,
      [UpdateRefreshTokensRequest]
    >(),
  };
  const transaction = { refreshToken: transactionRefreshToken };
  const runTransaction = jest.fn(
    async (callback: (client: typeof transaction) => Promise<unknown>) =>
      callback(transaction),
  );
  const prisma = {
    user,
    organizationMembership: membership,
    refreshToken,
    $transaction: runTransaction,
  } as unknown as PrismaService;
  const jwtService = new JwtService();
  const service = new AuthService(prisma, jwtService, {} as EmailService);
  const originalEnvironment = { ...process.env };

  beforeAll(() => {
    process.env.JWT_SECRET = 'refresh-session-test-secret';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.REFRESH_TOKEN_EXPIRES_IN = '30d';
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.BCRYPT_ROUNDS = '4';
    user.findUnique.mockResolvedValue({
      id: 'user-id',
      email: 'alex@example.edu',
      passwordHash: await bcrypt.hash('Password123!', 4),
      status: 'ACTIVE',
      emailVerifiedAt: new Date('2026-08-01T00:00:00.000Z'),
    });
    membership.findFirst.mockResolvedValue({
      organizationId: 'organization-id',
      role: 'MEMBER',
    });
    refreshToken.create.mockResolvedValue({ id: 'refresh-token-id' });
    refreshToken.updateMany.mockResolvedValue({ count: 1 });
    transactionRefreshToken.create.mockResolvedValue({
      id: 'next-refresh-token-id',
    });
    transactionRefreshToken.updateMany.mockResolvedValue({ count: 1 });
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it('issues a short access JWT and stores only the refresh token hash', async () => {
    const result = await service.login({
      email: 'alex@example.edu',
      password: 'Password123!',
    });

    const accessClaims = await jwtService.verifyAsync<{
      sub: string;
      exp: number;
      iat: number;
    }>(result.accessToken, { secret: process.env.JWT_SECRET });
    expect(accessClaims.sub).toBe('user-id');
    expect(accessClaims.exp - accessClaims.iat).toBe(15 * 60);

    const createRequest = refreshToken.create.mock.calls[0][0];
    expect(createRequest.data.tokenHash).toBe(
      createHash('sha256').update(result.refreshToken).digest('hex'),
    );
    expect(createRequest.data.tokenHash).not.toBe(result.refreshToken);
    expect(createRequest.data.familyId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.refreshTokenExpiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('rotates a valid refresh token inside one transaction', async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    refreshToken.findUnique.mockResolvedValue({
      id: 'refresh-token-id',
      familyId: 'family-id',
      expiresAt,
      usedAt: null,
      revokedAt: null,
      user: {
        id: 'user-id',
        email: 'alex@example.edu',
        status: 'ACTIVE',
        emailVerifiedAt: new Date('2026-08-01T00:00:00.000Z'),
      },
    });

    const result = await service.refreshSession('current-refresh-token');

    const claimRequest = transactionRefreshToken.updateMany.mock.calls[0][0];
    expect(claimRequest.where.id).toBe('refresh-token-id');
    expect(claimRequest.where.usedAt).toBeNull();
    expect(claimRequest.where.revokedAt).toBeNull();
    const createRequest = transactionRefreshToken.create.mock.calls[0][0];
    expect(createRequest.data.familyId).toBe('family-id');
    expect(createRequest.data.expiresAt).toBe(expiresAt);
    expect(createRequest.data.tokenHash).toBe(
      createHash('sha256').update(result.refreshToken).digest('hex'),
    );
    expect(result.refreshToken).not.toBe('current-refresh-token');
  });

  it('revokes the token family when a used token is replayed', async () => {
    refreshToken.findUnique.mockResolvedValue({
      id: 'refresh-token-id',
      familyId: 'family-id',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: new Date(),
      revokedAt: null,
      user: {
        id: 'user-id',
        email: 'alex@example.edu',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    });

    await expect(
      service.refreshSession('replayed-refresh-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    const replayRevocation = refreshToken.updateMany.mock.calls[0][0];
    expect(replayRevocation.where).toEqual({
      familyId: 'family-id',
      revokedAt: null,
    });
    expect(replayRevocation.data.revokedAt).toBeInstanceOf(Date);
    expect(runTransaction).not.toHaveBeenCalled();
  });

  it('revokes the current token family during logout', async () => {
    refreshToken.findUnique.mockResolvedValue({ familyId: 'family-id' });

    await service.revokeSession('current-refresh-token');

    const logoutRevocation = refreshToken.updateMany.mock.calls[0][0];
    expect(logoutRevocation.where).toEqual({
      familyId: 'family-id',
      revokedAt: null,
    });
    expect(logoutRevocation.data.revokedAt).toBeInstanceOf(Date);
  });
});
