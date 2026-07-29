import { Injectable } from '@nestjs/common';
import { PrismaService } from '@resourcehive/database';

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
}
