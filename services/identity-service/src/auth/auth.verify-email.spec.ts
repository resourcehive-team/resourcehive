import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@resourcehive/database';
import { EmailService } from '../email/email.service';
import { AuthService } from './auth.service';

interface FindVerificationTokenRequest {
  where: { tokenHash: string };
}

interface UpsertMembershipRequest {
  create: {
    userId: string;
    organizationId: string;
    role: string;
    status: string;
  };
}

interface UpdateUserRequest {
  data: { emailVerifiedAt: Date };
}

describe('AuthService email verification', () => {
  const findVerificationToken = jest.fn<
    Promise<unknown>,
    [FindVerificationTokenRequest]
  >();
  const claimVerificationToken = jest.fn();
  const findDomainConfiguration = jest.fn();
  const findAllowlistEntries = jest.fn();
  const markAllowlistEntriesUsed = jest.fn();
  const findMemberships = jest.fn();
  const upsertMembership = jest.fn<
    Promise<unknown>,
    [UpsertMembershipRequest]
  >();
  const updateUser = jest.fn<Promise<unknown>, [UpdateUserRequest]>();
  const transaction = {
    emailVerificationToken: {
      findUnique: findVerificationToken,
      updateMany: claimVerificationToken,
    },
    organizationEmailDomain: {
      findUnique: findDomainConfiguration,
    },
    organizationEmailAllowlist: {
      findMany: findAllowlistEntries,
      updateMany: markAllowlistEntriesUsed,
    },
    organizationMembership: {
      findMany: findMemberships,
      upsert: upsertMembership,
    },
    user: {
      update: updateUser,
    },
  };
  const runTransaction = jest.fn(
    async (callback: (client: typeof transaction) => Promise<unknown>) =>
      callback(transaction),
  );
  const prisma = {
    $transaction: runTransaction,
  } as unknown as PrismaService;
  const service = new AuthService(prisma, new JwtService(), {} as EmailService);

  beforeEach(() => {
    jest.clearAllMocks();
    findVerificationToken.mockResolvedValue({
      id: 'verification-token-id',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: 'user-id',
        email: 'alex@example.edu',
        firstName: 'Alex',
        lastName: 'Student',
        status: 'ACTIVE',
        emailVerifiedAt: null,
      },
    });
    findDomainConfiguration.mockResolvedValue({
      organizationId: 'root-organization-id',
      autoJoin: true,
      organization: {
        id: 'root-organization-id',
        name: 'Example University',
        status: 'ACTIVE',
      },
    });
    claimVerificationToken.mockResolvedValue({ count: 1 });
    findAllowlistEntries.mockResolvedValue([
      {
        id: 'allowlist-id',
        organization: {
          id: 'department-id',
          name: 'Computer Science',
        },
      },
    ]);
    upsertMembership.mockResolvedValue({ id: 'membership-id' });
    markAllowlistEntriesUsed.mockResolvedValue({ count: 1 });
    findMemberships.mockResolvedValue([]);
    updateUser.mockResolvedValue({
      id: 'user-id',
      email: 'alex@example.edu',
      firstName: 'Alex',
      lastName: 'Student',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    });
  });

  it('verifies the user and creates approved tenant memberships', async () => {
    const result = await service.verifyEmail('verification-token');

    const findTokenRequest = findVerificationToken.mock.calls[0][0];
    expect(findTokenRequest.where.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(upsertMembership).toHaveBeenCalledTimes(2);
    expect(
      upsertMembership.mock.calls.map(
        ([request]) => request.create.organizationId,
      ),
    ).toEqual(
      expect.arrayContaining(['root-organization-id', 'department-id']),
    );
    const rootMembershipRequest = upsertMembership.mock.calls.find(
      ([request]) => request.create.organizationId === 'root-organization-id',
    )?.[0];
    expect(rootMembershipRequest?.create).toEqual({
      userId: 'user-id',
      organizationId: 'root-organization-id',
      role: 'MEMBER',
      status: 'APPROVED',
    });
    expect(markAllowlistEntriesUsed).toHaveBeenCalled();
    expect(updateUser.mock.calls[0][0].data.emailVerifiedAt).toBeInstanceOf(
      Date,
    );
    expect(result).toMatchObject({
      user: {
        id: 'user-id',
        emailVerified: true,
        organizations: [
          { id: 'root-organization-id', status: 'APPROVED' },
          { id: 'department-id', status: 'APPROVED' },
        ],
      },
    });
  });

  it('rejects an expired verification link', async () => {
    findVerificationToken.mockResolvedValue({
      id: 'verification-token-id',
      usedAt: null,
      expiresAt: new Date(Date.now() - 60_000),
      user: {
        id: 'user-id',
        email: 'alex@example.edu',
        emailVerifiedAt: null,
      },
    });

    await expect(
      service.verifyEmail('verification-token'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(claimVerificationToken).not.toHaveBeenCalled();
  });

  it('reports an already verified user from the database', async () => {
    const verifiedAt = new Date(Date.now() - 60_000);
    findVerificationToken.mockResolvedValue({
      id: 'verification-token-id',
      usedAt: verifiedAt,
      expiresAt: new Date(Date.now() - 30_000),
      user: {
        id: 'user-id',
        email: 'alex@example.edu',
        firstName: 'Alex',
        lastName: 'Student',
        status: 'ACTIVE',
        emailVerifiedAt: verifiedAt,
      },
    });
    findMemberships.mockResolvedValue([
      {
        role: 'MEMBER',
        status: 'APPROVED',
        organization: {
          id: 'root-organization-id',
          name: 'Example University',
        },
      },
    ]);

    await expect(service.verifyEmail('verification-token')).resolves.toEqual({
      message: 'Email is already verified. You can log in.',
      user: {
        id: 'user-id',
        email: 'alex@example.edu',
        firstName: 'Alex',
        lastName: 'Student',
        status: 'ACTIVE',
        emailVerifiedAt: verifiedAt,
        emailVerified: true,
        organizations: [
          {
            id: 'root-organization-id',
            name: 'Example University',
            role: 'MEMBER',
            status: 'APPROVED',
          },
        ],
      },
    });
    expect(findMemberships).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-id',
          status: 'APPROVED',
        },
      }),
    );
    expect(claimVerificationToken).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('rejects a verification link claimed by another request', async () => {
    claimVerificationToken.mockResolvedValue({ count: 0 });

    await expect(
      service.verifyEmail('verification-token'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(upsertMembership).not.toHaveBeenCalled();
  });
});
