import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@resourcehive/database';
import { NotificationClientService } from '@resourcehive/notification-client';
import { MembershipsService } from './memberships.service';

describe('MembershipsService', () => {
  let service: MembershipsService;

  const prisma = {
    user: { findUnique: jest.fn() },
    organization: { findUnique: jest.fn(), findMany: jest.fn() },
    organizationMembership: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    organizationMembershipAudit: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const notifications = { sendMembershipDecision: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      (callback: (transaction: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
    );
    notifications.sendMembershipDecision.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationClientService, useValue: notifications },
      ],
    }).compile();
    service = module.get<MembershipsService>(MembershipsService);
  });

  it('creates a pending membership request for an active regular user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      status: 'ACTIVE',
      platformRole: 'USER',
    });
    prisma.organization.findUnique.mockResolvedValue({
      id: 'org',
      status: 'ACTIVE',
    });
    prisma.organizationMembership.findUnique.mockResolvedValue(null);
    prisma.organizationMembership.create.mockResolvedValue({
      status: 'PENDING',
    });

    await expect(service.requestMembership('user', 'org')).resolves.toEqual({
      status: 'PENDING',
    });
    expect(prisma.organizationMembership.create).toHaveBeenCalledWith({
      data: {
        userId: 'user',
        organizationId: 'org',
        status: 'PENDING',
        role: 'MEMBER',
      },
    });
  });

  it('blocks platform administrators and resubmission after rejection', async () => {
    prisma.user.findUnique.mockResolvedValue({
      status: 'ACTIVE',
      platformRole: 'PLATFORM_ADMIN',
    });
    await expect(service.requestMembership('platform', 'org')).rejects.toThrow(
      ForbiddenException,
    );

    prisma.user.findUnique.mockResolvedValue({
      status: 'ACTIVE',
      platformRole: 'USER',
    });
    prisma.organization.findUnique.mockResolvedValue({
      id: 'org',
      status: 'ACTIVE',
    });
    prisma.organizationMembership.findUnique.mockResolvedValue({
      status: 'REJECTED',
    });
    await expect(service.requestMembership('user', 'org')).rejects.toThrow(
      ConflictException,
    );
  });

  it('approves a pending request, records an audit event, and publishes a notification', async () => {
    prisma.user.findUnique.mockResolvedValue({
      status: 'ACTIVE',
      platformRole: 'USER',
    });
    prisma.organization.findUnique.mockResolvedValue({ status: 'ACTIVE' });
    prisma.organizationMembership.findUnique
      .mockResolvedValueOnce({ role: 'ADMIN', status: 'APPROVED' })
      .mockResolvedValueOnce({
        id: 'membership',
        userId: 'target',
        organizationId: 'org',
        role: 'MEMBER',
        status: 'PENDING',
        reviewedBy: null,
        reviewedAt: null,
        reviewNote: null,
        user: { id: 'target', status: 'ACTIVE' },
        organization: { name: 'Engineering' },
      });
    prisma.organizationMembership.updateMany.mockResolvedValue({ count: 1 });
    prisma.organizationMembershipAudit.create.mockResolvedValue({});

    const result = await service.updateMembershipStatus(
      'target',
      'org',
      'APPROVED',
      'admin',
    );

    expect(result.status).toBe('APPROVED');
    const auditCall = (
      prisma.organizationMembershipAudit.create as unknown as {
        mock: { calls: Array<[unknown]> };
      }
    ).mock.calls[0]?.[0] as {
      data: { membershipId: string; actorUserId: string; action: string };
    };
    expect(auditCall.data).toEqual(
      expect.objectContaining({
        membershipId: 'membership',
        actorUserId: 'admin',
        action: 'APPROVED',
      }),
    );
    expect(notifications.sendMembershipDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: 'target',
        organizationName: 'Engineering',
        decision: 'APPROVED',
      }),
    );
  });
});
