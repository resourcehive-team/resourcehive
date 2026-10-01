import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PrismaService } from '@resourcehive/database';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async createChildOrganization(
    parentId: string,
    input: { name: string; type: string; adminEmail: string },
    actorUserId: string,
  ) {
    const name = input.name.trim();
    const adminEmail = input.adminEmail.trim().toLowerCase();
    if (!name || name.length > 200) {
      throw new BadRequestException(
        'Organization name must be 1–200 characters.',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      const parent = await transaction.organization.findUnique({
        where: { id: parentId },
        select: { id: true, rootOrganizationId: true, status: true },
      });
      if (!parent || parent.status !== 'ACTIVE') {
        throw new NotFoundException('Active parent organization not found.');
      }

      const hierarchy = await transaction.organization.findMany({
        where: { rootOrganizationId: parent.rootOrganizationId },
        select: { id: true, parentId: true, status: true },
      });
      const organizationById = new Map(
        hierarchy.map((organization) => [organization.id, organization]),
      );
      const ancestors = new Set<string>();
      let currentId: string | null = parentId;
      let reachedRoot = false;
      while (currentId && !ancestors.has(currentId)) {
        const current = organizationById.get(currentId);
        if (!current || current.status !== 'ACTIVE') {
          throw new ForbiddenException(
            'The parent organization hierarchy must be active.',
          );
        }
        ancestors.add(currentId);
        if (currentId === parent.rootOrganizationId) {
          reachedRoot = true;
          break;
        }
        currentId = current.parentId;
      }
      if (!reachedRoot) {
        throw new ForbiddenException(
          'The parent organization must belong to an active university hierarchy.',
        );
      }

      const actorMembership =
        await transaction.organizationMembership.findFirst({
          where: {
            userId: actorUserId,
            organizationId: { in: [...ancestors] },
            role: 'ADMIN',
            status: 'APPROVED',
          },
        });
      if (!actorMembership) {
        throw new ForbiddenException(
          'Administrator privileges are required for the parent organization.',
        );
      }

      const admin = await transaction.user.findUnique({
        where: { email: adminEmail },
        select: {
          id: true,
          email: true,
          status: true,
          platformRole: true,
          emailVerifiedAt: true,
        },
      });
      if (
        !admin ||
        admin.status !== 'ACTIVE' ||
        !admin.emailVerifiedAt ||
        admin.platformRole !== 'USER'
      ) {
        throw new ConflictException(
          'The administrator must be an active, verified user account.',
        );
      }
      const eligibleMembership =
        await transaction.organizationMembership.findFirst({
          where: {
            userId: admin.id,
            status: 'APPROVED',
            organization: { rootOrganizationId: parent.rootOrganizationId },
          },
        });
      if (!eligibleMembership) {
        throw new ConflictException(
          'The administrator must be an approved member of this university.',
        );
      }

      const organization = await transaction.organization.create({
        data: {
          name,
          type: input.type,
          parentId,
          rootOrganizationId: parent.rootOrganizationId,
          joinBonusPoints: 0,
          status: 'ACTIVE',
          createdBy: actorUserId,
        },
      });
      const membership = await transaction.organizationMembership.create({
        data: {
          userId: admin.id,
          organizationId: organization.id,
          role: 'ADMIN',
          status: 'APPROVED',
          reviewedBy: actorUserId,
          reviewedAt: new Date(),
        },
      });
      await transaction.organizationMembershipAudit.create({
        data: {
          membershipId: membership.id,
          actorUserId,
          action: 'ADMIN_GRANTED',
        },
      });

      return { organization, administrator: { email: admin.email } };
    });
  }

  // Implement root and child organization reads
  async findAllRoots() {
    return this.prisma.organization.findMany({
      where: { parentId: null },
    });
  }

  async findChildren(rootId: string) {
    return this.prisma.organization.findMany({
      where: { rootOrganizationId: rootId, parentId: { not: null } },
    });
  }

  async findOne(id: string) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { children: true },
    });
  }

  // Email domain methods
  async getEmailDomains(organizationId: string) {
    return this.prisma.organizationEmailDomain.findMany({
      where: { organizationId },
    });
  }

  async addEmailDomain(
    organizationId: string,
    domain: string,
    autoJoin: boolean = false,
  ) {
    const normalizedDomain = domain.trim().toLowerCase().replace(/\.$/, '');
    try {
      return await this.prisma.organizationEmailDomain.create({
        data: { organizationId, domain: normalizedDomain, autoJoin },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          'This email domain is already assigned to an organization.',
        );
      }
      throw error;
    }
  }

  async updateEmailDomain(
    organizationId: string,
    domainId: string,
    autoJoin: boolean,
  ) {
    const result = await this.prisma.organizationEmailDomain.updateMany({
      where: { id: domainId, organizationId },
      data: { autoJoin },
    });
    if (result.count === 0)
      throw new NotFoundException('Email domain not found.');
    return this.prisma.organizationEmailDomain.findUnique({
      where: { id: domainId },
    });
  }

  async removeEmailDomain(organizationId: string, domainId: string) {
    return this.prisma.organizationEmailDomain.delete({
      where: { id: domainId, organizationId },
    });
  }

  // allowlist method
  async getAllowlist(organizationId: string) {
    return this.prisma.organizationEmailAllowlist.findMany({
      where: { organizationId },
    });
  }

  async addToAllowlist(
    organizationId: string,
    email: string,
    addedByUserId: string,
  ) {
    try {
      return await this.prisma.organizationEmailAllowlist.create({
        data: {
          organizationId,
          email: email.trim().toLowerCase(),
          addedBy: addedByUserId,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          'This email is already on the organization allowlist.',
        );
      }
      throw error;
    }
  }

  async removeFromAllowlist(organizationId: string, allowlistId: string) {
    return this.prisma.organizationEmailAllowlist.delete({
      where: { id: allowlistId, organizationId },
    });
  }

  async update(id: string, data: UpdateOrganizationDto) {
    const updateData: Prisma.OrganizationUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.joinBonusPoints !== undefined)
      updateData.joinBonusPoints = data.joinBonusPoints;

    return this.prisma.organization.update({
      where: { id },
      data: updateData,
    });
  }

  async allocateSemesterPoints(
    organizationId: string,
    targetOrganizationIds: string[],
    amount: number,
    semesterName: string,
  ) {
    if (targetOrganizationIds.length === 0) {
      return { count: 0 };
    }

    const allOrgs = await this.prisma.organization.findMany({
      where: { rootOrganizationId: organizationId },
      select: { id: true, parentId: true },
    });

    const descendants = new Set<string>();
    for (const targetId of targetOrganizationIds) {
      descendants.add(targetId);
      let added = true;
      while (added) {
        added = false;
        for (const org of allOrgs) {
          if (
            org.parentId &&
            descendants.has(org.parentId) &&
            !descendants.has(org.id)
          ) {
            descendants.add(org.id);
            added = true;
          }
        }
      }
    }

    const memberships = await this.prisma.organizationMembership.findMany({
      where: {
        organizationId: { in: Array.from(descendants) },
        status: 'APPROVED',
      },
    });

    const uniqueMemberships: typeof memberships = [];
    const seenUsers = new Set<string>();
    for (const m of memberships) {
      if (!seenUsers.has(m.userId)) {
        seenUsers.add(m.userId);
        uniqueMemberships.push(m);
      }
    }

    if (uniqueMemberships.length === 0) {
      return { count: 0 };
    }

    return this.prisma.$transaction(
      async (tx) => {
        // Find if ANY of the selected targets already got this semester points
        const existingAllocation = await tx.pointTransaction.findFirst({
          where: {
            sourceOrganizationId: { in: targetOrganizationIds },
            transactionType: 'SEMESTER_ALLOCATION',
            description: semesterName,
          },
        });

        if (existingAllocation) {
          throw new ConflictException(
            `Semester points for '${semesterName}' have already been allocated to one or more selected organizations.`,
          );
        }

        const data = [];
        // Group users by the first selected organization they belong to (to credit the transaction source correctly)
        // Or simply credit it to the organizationId (root) since it's a batch operation
        for (const membership of uniqueMemberships) {
          data.push({
            userId: membership.userId,
            rootOrganizationId: organizationId,
            amount,
            transactionType: 'SEMESTER_ALLOCATION',
            sourceOrganizationId: membership.organizationId, // attribute to their actual org
            description: semesterName,
          });
        }

        const result = await tx.pointTransaction.createMany({
          data,
        });

        return { count: result.count };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
