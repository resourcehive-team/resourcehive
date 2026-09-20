import { Injectable } from '@nestjs/common';
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
    amount: number,
    semesterName: string,
  ) {
    const memberships = await this.prisma.organizationMembership.findMany({
      where: { organizationId, status: 'APPROVED' },
    });

    if (memberships.length === 0) {
      return { count: 0 };
    }

    const data = memberships.map((membership) => ({
      userId: membership.userId,
      amount,
      transactionType: 'SEMESTER_ALLOCATION',
      sourceOrganizationId: organizationId,
      description: semesterName,
    }));

    const result = await this.prisma.pointTransaction.createMany({
      data,
    });

    return { count: result.count };
  }
}
