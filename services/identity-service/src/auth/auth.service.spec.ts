import { BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@resourcehive/database';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../email/email.service';
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

interface CreatePlatformOrganizationRequest {
  data: {
    id: string;
    name: string;
    type: string;
    parentId: string | null;
    rootOrganizationId: string;
    joinBonusPoints: number;
    status: string;
    createdBy: string;
  };
  select: { id: true; name: true };
}

interface CreatePlatformMembershipRequest {
  data: {
    userId: string;
    organizationId: string;
    role: string;
    status: string;
    reviewedBy: string;
    reviewedAt: Date;
  };
  select: { id: true };
}

interface CreateMembershipAuditRequest {
  data: { membershipId: string; actorUserId: string; action: string };
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
  const transactionOrganization = {
    create: jest.fn<
      Promise<{ id: string; name: string }>,
      [CreatePlatformOrganizationRequest]
    >(),
  };
  const transactionMembership = {
    create: jest.fn<
      Promise<{ id: string }>,
      [CreatePlatformMembershipRequest]
    >(),
  };
  const transactionMembershipAudit = {
    create: jest.fn<Promise<{ id: string }>, [CreateMembershipAuditRequest]>(),
  };
  const transaction = {
    user: transactionUser,
    emailVerificationToken,
    organization: transactionOrganization,
    organizationMembership: transactionMembership,
    organizationMembershipAudit: transactionMembershipAudit,
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
  const sendVerificationEmail = jest.fn();
  const emailService = {
    sendVerificationEmail,
  } as unknown as EmailService;
  const service = new AuthService(prisma, new JwtService(), emailService);
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
    sendVerificationEmail.mockResolvedValue({
      developmentVerificationUrl: 'verification-url',
    });
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
      developmentVerificationUrl: 'verification-url',
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
    expect(sendVerificationEmail).toHaveBeenCalledWith(
      'user-id',
      'alex@example.edu',
      expect.any(String),
    );
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

  it('creates a root university, its first admin, and an audit event atomically', async () => {
    user.findUnique.mockResolvedValueOnce({
      id: 'tenant-admin-id',
      email: 'admin@example.edu',
      status: 'ACTIVE',
      platformRole: 'USER',
      emailVerifiedAt: new Date(),
    });
    transactionOrganization.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: data.id, name: data.name }),
    );
    transactionMembership.create.mockResolvedValue({ id: 'membership-id' });
    transactionMembershipAudit.create.mockResolvedValue({ id: 'audit-id' });

    const result = await service.createPlatformUniversity(
      '  Example University  ',
      ' ADMIN@EXAMPLE.EDU ',
      'platform-admin-id',
    );

    expect(transactionOrganization.create).toHaveBeenCalledTimes(1);
    const createOrganizationRequest =
      transactionOrganization.create.mock.calls[0][0];
    expect(createOrganizationRequest.data).toMatchObject({
      name: 'Example University',
      type: 'UNIVERSITY',
      parentId: null,
      joinBonusPoints: 0,
      status: 'ACTIVE',
      createdBy: 'platform-admin-id',
    });
    expect(createOrganizationRequest.data.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(createOrganizationRequest.data.rootOrganizationId).toBe(
      createOrganizationRequest.data.id,
    );
    expect(transactionMembership.create).toHaveBeenCalledTimes(1);
    const createMembershipRequest =
      transactionMembership.create.mock.calls[0][0];
    expect(createMembershipRequest.data).toMatchObject({
      userId: 'tenant-admin-id',
      organizationId: createOrganizationRequest.data.id,
      role: 'ADMIN',
      status: 'APPROVED',
      reviewedBy: 'platform-admin-id',
    });
    expect(createMembershipRequest.data.reviewedAt).toBeInstanceOf(Date);
    expect(transactionMembershipAudit.create).toHaveBeenCalledWith({
      data: {
        membershipId: 'membership-id',
        actorUserId: 'platform-admin-id',
        action: 'ADMIN_GRANTED',
      },
    });
    expect(runTransaction).toHaveBeenCalledTimes(1);
    expect(result.administrator.email).toBe('admin@example.edu');
  });

  it('rejects an ineligible tenant admin before creating anything', async () => {
    user.findUnique.mockResolvedValueOnce({
      id: 'tenant-admin-id',
      email: 'admin@example.edu',
      status: 'ACTIVE',
      platformRole: 'USER',
      emailVerifiedAt: null,
    });

    await expect(
      service.createPlatformUniversity(
        'Example University',
        'admin@example.edu',
        'platform-admin-id',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(runTransaction).not.toHaveBeenCalled();
  });
});
