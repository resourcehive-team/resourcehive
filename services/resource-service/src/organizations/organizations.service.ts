import { Injectable, ConflictException } from '@nestjs/common';
import { Prisma, PrismaService } from '@resourcehive/database';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.organizationEmailDomain.create({
      data: { organizationId, domain, autoJoin },
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
    return this.prisma.organizationEmailAllowlist.create({
      data: { organizationId, email, addedBy: addedByUserId },
    });
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
    targetOrganizationId: string,
    amount: number,
    semesterName: string,
  ) {
    const targetOrg = await this.prisma.organization.findUnique({
      where: { id: targetOrganizationId },
      select: { rootOrganizationId: true },
    });

    if (!targetOrg) {
      throw new ConflictException(`Target organization not found.`);
    }

    const allOrgs = await this.prisma.organization.findMany({
      where: { rootOrganizationId: targetOrg.rootOrganizationId },
      select: { id: true, parentId: true },
    });

    const descendants = new Set<string>();
    descendants.add(targetOrganizationId);
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

    const memberships = await this.prisma.organizationMembership.findMany({
      where: { organizationId: { in: Array.from(descendants) }, status: 'APPROVED' },
    });

    const uniqueMemberships = [];
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
        const existingAllocation = await tx.pointTransaction.findFirst({
          where: {
            sourceOrganizationId: targetOrganizationId,
            transactionType: 'SEMESTER_ALLOCATION',
            description: semesterName,
          },
        });

        if (existingAllocation) {
          throw new ConflictException(
            `Semester points for '${semesterName}' have already been allocated to this organization.`,
          );
        }

        const data = uniqueMemberships.map((membership) => ({
          userId: membership.userId,
          amount,
          transactionType: 'SEMESTER_ALLOCATION',
          sourceOrganizationId: targetOrganizationId,
          description: semesterName,
        }));

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
