import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '@resourcehive/database';

@Injectable()
export class MembershipsService {
  constructor(private prisma: PrismaService) {}

  // for membership requests
  async requestMembership(userId: string, organizationId: string) {
    const existing = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });

    if (existing) {
      throw new ConflictException('Membership request already exists');
    }

    return this.prisma.organizationMembership.create({
      data: {
        userId,
        organizationId,
        status: 'PENDING',
        role: 'MEMBER'
      },
    });
  }

  // for getting user's memberships
  async getUserMemberships(userId: string) {
    return this.prisma.organizationMembership.findMany({
      where: { userId },
      include: { organization: true },
    });
  }

  // for getting all members in an organization
  async getOrganizationMembers(organizationId: string) {
    return this.prisma.organizationMembership.findMany({
      where: { organizationId },
      include: { user: true },
    });
  }

}
