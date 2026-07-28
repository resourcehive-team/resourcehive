import { BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@resourcehive/database';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

interface CreateUserRequest {
  data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
  };
}

interface CreatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: Date;
}

interface CreateVerificationTokenRequest {
  data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  };
}

describe('AuthService registration', () => {
  const organizationEmailDomain = {
    findUnique: jest.fn(),
  };
  const user = {
    findUnique: jest.fn(),
  };
  const transactionUser = {
    create: jest.fn<Promise<CreatedUser>, [CreateUserRequest]>(),
  };
  const emailVerificationToken = {
    create: jest.fn<
      Promise<{ id: string }>,
      [CreateVerificationTokenRequest]
    >(),
  };
  const transaction = {
    user: transactionUser,
    emailVerificationToken,
  };
  const runTransaction = jest.fn(
    async (callback: (client: typeof transaction) => Promise<unknown>) =>
      callback(transaction),
  );
  const prisma = {
    organizationEmailDomain,
    user,
    $transaction: runTransaction,
  } as unknown as PrismaService;
  const service = new AuthService(prisma, new JwtService());
  const originalBcryptRounds = process.env.BCRYPT_ROUNDS;

  beforeAll(() => {
    process.env.BCRYPT_ROUNDS = '4';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    organizationEmailDomain.findUnique.mockResolvedValue({
      organizationId: 'organization-id',
      organization: {
        name: 'Example University',
        status: 'ACTIVE',
      },
    });
    user.findUnique.mockResolvedValue(null);
    transactionUser.create.mockResolvedValue({
      id: 'user-id',
      email: 'alex@example.edu',
      firstName: 'Alex',
      lastName: 'Student',
      status: 'ACTIVE',
      createdAt: new Date('2026-07-28T00:00:00.000Z'),
    });
    emailVerificationToken.create.mockResolvedValue({ id: 'token-id' });
  });

  afterAll(() => {
    if (originalBcryptRounds === undefined) {
      delete process.env.BCRYPT_ROUNDS;
    } else {
      process.env.BCRYPT_ROUNDS = originalBcryptRounds;
    }
  });

  it('creates an unverified user and stores a hashed verification token', async () => {
    const result = await service.register({
      firstName: ' Alex ',
      lastName: ' Student ',
      email: 'Alex@Example.EDU',
      password: 'Password123!',
    });

    expect(organizationEmailDomain.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { domain: 'example.edu' },
      }),
    );
    const createUserRequest = transactionUser.create.mock.calls[0][0];
    expect(createUserRequest.data).toMatchObject({
      email: 'alex@example.edu',
      firstName: 'Alex',
      lastName: 'Student',
    });
    await expect(
      bcrypt.compare('Password123!', createUserRequest.data.passwordHash),
    ).resolves.toBe(true);

    const createTokenRequest = emailVerificationToken.create.mock.calls[0][0];
    expect(createTokenRequest.data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(createTokenRequest.data.expiresAt.getTime()).toBeGreaterThan(
      Date.now(),
    );
    expect(result).toMatchObject({
      verificationRequired: true,
      user: {
        id: 'user-id',
        email: 'alex@example.edu',
        emailVerified: false,
        organization: {
          id: 'organization-id',
          name: 'Example University',
        },
      },
    });
  });

  it('rejects an email without a configured organization domain', async () => {
    organizationEmailDomain.findUnique.mockResolvedValue(null);

    await expect(
      service.register({
        firstName: 'Alex',
        lastName: 'Student',
        email: 'alex@unknown.test',
        password: 'Password123!',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(runTransaction).not.toHaveBeenCalled();
  });

  it('rejects an email that is already registered', async () => {
    user.findUnique.mockResolvedValue({ id: 'existing-user' });

    await expect(
      service.register({
        firstName: 'Alex',
        lastName: 'Student',
        email: 'alex@example.edu',
        password: 'Password123!',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(runTransaction).not.toHaveBeenCalled();
  });
});
