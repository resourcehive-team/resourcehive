import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@resourcehive/database';
import { NotificationClientService } from '@resourcehive/notification-client';

type MembershipDecision = 'APPROVED' | 'REJECTED';

@Injectable()
export class MembershipsService {
  private readonly logger = new Logger(MembershipsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationClientService,
  ) {}

  async requestMembership(userId: string, organizationId: string) {
    const [user, organization, existing] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { status: true, platformRole: true },
      }),
      this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, status: true },
      }),
      this.prisma.organizationMembership.findUnique({
        where: { userId_organizationId: { userId, organizationId } },
      }),
    ]);

    this.assertRegularUser(user);
    if (!organization || organization.status !== 'ACTIVE') {
      throw new NotFoundException('Organization not found');
    }
    if (existing) {
      throw new ConflictException(
        existing.status === 'REJECTED'
          ? 'This membership request was rejected. Contact an organization administrator for reconsideration.'
          : 'Membership request already exists',
      );
    }

    return this.prisma.organizationMembership.create({
      data: {
        userId,
        organizationId,
        status: 'PENDING',
        role: 'MEMBER',
      },
    });
  }

  // for updating membership status (approve/reject)
  async updateMembershipStatus(
    userId: string,
    organizationId: string,
    status: string,
    approvedByUserId: string,
  ) {
    const membership = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership) {
      throw new NotFoundException('Membership request not found');
    }
    return this.prisma.organizationMembership.update({
      where: { userId_organizationId: { userId, organizationId } },
      data: { status, reviewedBy: approvedByUserId },
    });
  }

  // for getting user's memberships
  async getUserMemberships(userId: string) {
    const memberships = await this.prisma.organizationMembership.findMany({
      where: { userId },
      include: {
        organization: true,
        auditEvents: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return memberships.map((membership) =>
      this.toMembershipResponse(membership),
    );
  }

  async getOrganizationMembers(organizationId: string, actorUserId: string) {
    await this.assertDirectOrganizationAdmin(actorUserId, organizationId);

    const memberships = await this.prisma.organizationMembership.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            status: true,
          },
        },
        auditEvents: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return memberships.map((membership) => ({
      userId: membership.userId,
      organizationId: membership.organizationId,
      role: membership.role,
      status: membership.status,
      joinedAt: membership.joinedAt,
      reviewedBy: membership.reviewedBy,
      reviewedAt: membership.reviewedAt,
      reviewNote: membership.reviewNote,
      latestAudit: membership.auditEvents[0] ?? null,
      user: membership.user,
    }));
  }

  async updateMembershipStatus(
    targetUserId: string,
    organizationId: string,
    decision: MembershipDecision,
    actorUserId: string,
    reason?: string,
  ) {
    await this.assertDirectOrganizationAdmin(actorUserId, organizationId);

    const result = await this.prisma.$transaction(async (transaction) => {
      const membership = await transaction.organizationMembership.findUnique({
        where: {
          userId_organizationId: {
            userId: targetUserId,
            organizationId,
          },
        },
        include: {
          user: { select: { id: true, status: true } },
          organization: { select: { name: true } },
        },
      });

      if (!membership) {
        throw new NotFoundException('Membership request not found');
      }
      if (decision === 'APPROVED' && membership.user.status !== 'ACTIVE') {
        throw new ConflictException('The applicant account is not active');
      }

      const allowedStatuses =
        decision === 'APPROVED' ? ['PENDING', 'REJECTED'] : ['PENDING'];
      if (!allowedStatuses.includes(membership.status)) {
        throw new ConflictException(
          decision === 'APPROVED'
            ? 'This membership has already been reviewed'
            : 'Only pending membership requests can be rejected',
        );
      }

      const now = new Date();
      const updated = await transaction.organizationMembership.updateMany({
        where: { id: membership.id, status: { in: allowedStatuses } },
        data: {
          status: decision,
          reviewedBy: actorUserId,
          reviewedAt: now,
          reviewNote: decision === 'REJECTED' ? reason?.trim() || null : null,
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException(
          'This membership was reviewed by another administrator',
        );
      }

      await transaction.organizationMembershipAudit.create({
        data: {
          membershipId: membership.id,
          actorUserId,
          action: decision,
          note: decision === 'REJECTED' ? reason?.trim() || null : null,
        },
      });

      return {
        userId: membership.user.id,
        organizationName: membership.organization.name,
        membership: {
          ...membership,
          status: decision,
          reviewedBy: actorUserId,
          reviewedAt: now,
          reviewNote: decision === 'REJECTED' ? reason?.trim() || null : null,
        },
      };
    });

    await this.publishDecisionNotification(
      result.userId,
      result.organizationName,
      decision,
      result.membership.id,
    );
    return result.membership;
  }

  async updateMembershipRole(
    targetUserId: string,
    organizationId: string,
    role: string,
    actorUserId: string,
  ) {
    await this.assertDirectOrganizationAdmin(actorUserId, organizationId);
    if (role !== 'ADMIN' && role !== 'MEMBER') {
      throw new ConflictException('Role must be ADMIN or MEMBER');
    }

    const membership = await this.prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: { userId: targetUserId, organizationId },
      },
    });
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }
    if (membership.status !== 'APPROVED') {
      throw new ConflictException('Only approved memberships can change role');
    }
    if (membership.role === role) return membership;

    if (membership.role === 'ADMIN' && role !== 'ADMIN') {
      await this.assertNotLastAdministrator(organizationId);
    }

    return this.prisma.$transaction(async (transaction) => {
      const changed = await transaction.organizationMembership.update({
        where: {
          userId_organizationId: { userId: targetUserId, organizationId },
        },
        data: { role },
      });
      await transaction.organizationMembershipAudit.create({
        data: {
          membershipId: membership.id,
          actorUserId,
          action: role === 'ADMIN' ? 'ADMIN_GRANTED' : 'ADMIN_REVOKED',
        },
      });
      return changed;
    });
  }

  async removeMembership(
    targetUserId: string,
    organizationId: string,
    actorUserId: string,
  ) {
    await this.assertDirectOrganizationAdmin(actorUserId, organizationId);
    const membership = await this.prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: { userId: targetUserId, organizationId },
      },
    });
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }
    if (membership.role === 'ADMIN' && membership.status === 'APPROVED') {
      await this.assertNotLastAdministrator(organizationId);
    }
    return this.prisma.organizationMembership.delete({
      where: {
        userId_organizationId: { userId: targetUserId, organizationId },
      },
    });
  }

  async getChildAdministrators(
    parentOrganizationId: string,
    actorUserId: string,
  ) {
    await this.assertDirectOrganizationAdmin(actorUserId, parentOrganizationId);
    const children = await this.prisma.organization.findMany({
      where: { parentId: parentOrganizationId },
      select: { id: true, name: true, type: true, status: true },
      orderBy: { name: 'asc' },
    });
    if (children.length === 0) return [];

    const admins = await this.prisma.organizationMembership.findMany({
      where: {
        organizationId: { in: children.map((child) => child.id) },
        role: 'ADMIN',
        status: 'APPROVED',
      },
      select: {
        userId: true,
        organizationId: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            status: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
    const adminsByOrganization = new Map<string, typeof admins>();
    for (const admin of admins) {
      const current = adminsByOrganization.get(admin.organizationId) ?? [];
      current.push(admin);
      adminsByOrganization.set(admin.organizationId, current);
    }
    return children.map((child) => ({
      ...child,
      administrators: adminsByOrganization.get(child.id) ?? [],
    }));
  }

  async appointChildAdministrator(
    parentOrganizationId: string,
    childOrganizationId: string,
    email: string,
    actorUserId: string,
  ) {
    await this.assertDirectOrganizationAdmin(actorUserId, parentOrganizationId);
    const child = await this.prisma.organization.findUnique({
      where: { id: childOrganizationId },
      select: { id: true, parentId: true, status: true },
    });
    if (!child || child.parentId !== parentOrganizationId) {
      throw new NotFoundException('Immediate child organization not found');
    }
    if (child.status !== 'ACTIVE') {
      throw new ConflictException('The child organization is not active');
    }

    const candidate = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, status: true, emailVerifiedAt: true },
    });
    if (
      !candidate ||
      candidate.status !== 'ACTIVE' ||
      !candidate.emailVerifiedAt
    ) {
      throw new ConflictException(
        'The administrator must be an active, verified user',
      );
    }

    const membership = await this.prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: candidate.id,
          organizationId: child.id,
        },
      },
    });
    if (!membership || !['PENDING', 'APPROVED'].includes(membership.status)) {
      throw new ConflictException(
        'The user must already have a pending or approved membership in this organization',
      );
    }
    if (membership.role === 'ADMIN' && membership.status === 'APPROVED') {
      return membership;
    }

    return this.prisma.$transaction(async (transaction) => {
      const now = new Date();
      const changed = await transaction.organizationMembership.updateMany({
        where: { id: membership.id, status: { in: ['PENDING', 'APPROVED'] } },
        data: {
          status: 'APPROVED',
          role: 'ADMIN',
          reviewedBy: actorUserId,
          reviewedAt: now,
          reviewNote: null,
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException(
          'This membership changed while it was being appointed',
        );
      }
      await transaction.organizationMembershipAudit.create({
        data: {
          membershipId: membership.id,
          actorUserId,
          action: 'ADMIN_GRANTED',
        },
      });
      return transaction.organizationMembership.findUniqueOrThrow({
        where: { id: membership.id },
      });
    });
  }

  async revokeChildAdministrator(
    parentOrganizationId: string,
    childOrganizationId: string,
    targetUserId: string,
    actorUserId: string,
  ) {
    await this.assertDirectOrganizationAdmin(actorUserId, parentOrganizationId);
    const child = await this.prisma.organization.findUnique({
      where: { id: childOrganizationId },
      select: { parentId: true },
    });
    if (!child || child.parentId !== parentOrganizationId) {
      throw new NotFoundException('Immediate child organization not found');
    }

    const membership = await this.prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: targetUserId,
          organizationId: childOrganizationId,
        },
      },
    });
    if (
      !membership ||
      membership.status !== 'APPROVED' ||
      membership.role !== 'ADMIN'
    ) {
      throw new NotFoundException('Child administrator not found');
    }
    await this.assertNotLastAdministrator(childOrganizationId);

    return this.prisma.$transaction(async (transaction) => {
      const changed = await transaction.organizationMembership.update({
        where: { id: membership.id },
        data: { role: 'MEMBER' },
      });
      await transaction.organizationMembershipAudit.create({
        data: {
          membershipId: membership.id,
          actorUserId,
          action: 'ADMIN_REVOKED',
        },
      });
      return changed;
    });
  }

  private async assertDirectOrganizationAdmin(
    actorUserId: string,
    organizationId: string,
  ) {
    const [user, organization, membership] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: actorUserId },
        select: { status: true, platformRole: true },
      }),
      this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { status: true },
      }),
      this.prisma.organizationMembership.findUnique({
        where: {
          userId_organizationId: { userId: actorUserId, organizationId },
        },
        select: { role: true, status: true },
      }),
    ]);

    if (
      !user ||
      user.status !== 'ACTIVE' ||
      user.platformRole !== 'USER' ||
      !organization ||
      organization.status !== 'ACTIVE' ||
      !membership ||
      membership.status !== 'APPROVED' ||
      membership.role !== 'ADMIN'
    ) {
      throw new ForbiddenException(
        'Direct organization administrator privileges are required',
      );
    }
  }

  private async assertNotLastAdministrator(organizationId: string) {
    const adminCount = await this.prisma.organizationMembership.count({
      where: { organizationId, role: 'ADMIN', status: 'APPROVED' },
    });
    if (adminCount <= 1) {
      throw new ConflictException('Cannot remove the last administrator');
    }
  }

  private assertRegularUser(
    user: { status: string; platformRole: string } | null,
  ): asserts user is { status: string; platformRole: string } {
    if (!user || user.status !== 'ACTIVE' || user.platformRole !== 'USER') {
      throw new ForbiddenException(
        'Platform administrators cannot request organization membership',
      );
    }
  }

  private async publishDecisionNotification(
    userId: string,
    organizationName: string,
    decision: MembershipDecision,
    correlationId: string,
  ) {
    try {
      await this.notifications.sendMembershipDecision({
        recipientUserId: userId,
        organizationName,
        decision,
        correlationId,
      });
    } catch (error) {
      this.logger.warn(
        `Membership decision notification could not be published (${decision}, ${correlationId}): ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  private toMembershipResponse<
    T extends {
      reviewedBy: string | null;
      reviewedAt: Date | null;
      reviewNote: string | null;
      auditEvents: Array<{
        action: string;
        note: string | null;
        createdAt: Date;
      }>;
    },
  >(membership: T) {
    return {
      ...membership,
      latestAudit: membership.auditEvents[0] ?? null,
      auditEvents: undefined,
    };
  }
}
