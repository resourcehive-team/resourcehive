import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@resourcehive/database';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

@Injectable()
export class ResourcesService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, userId: string, dto: CreateResourceDto) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId }
    });
    if (!org) throw new NotFoundException('Organization not found');

    const rootOrgId = org.rootOrganizationId || org.id;

    return this.prisma.resource.create({
      data: {
        name: dto.name,
        description: dto.description,
        pointCost: dto.pointCost || 0,
        ownerOrganizationId: organizationId,
        rootOrganizationId: rootOrgId,
        createdByUserId: userId,
      }
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.resource.findMany({
      where: { ownerOrganizationId: organizationId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(organizationId: string, resourceId: string) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId }
    });
    if (!resource || resource.ownerOrganizationId !== organizationId) {
      throw new NotFoundException('Resource not found');
    }
    return resource;
  }

  async update(organizationId: string, resourceId: string, dto: UpdateResourceDto) {
    const resource = await this.prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource || resource.ownerOrganizationId !== organizationId) {
       throw new NotFoundException('Resource not found');
    }
    return this.prisma.resource.update({
      where: { id: resourceId },
      data: dto
    });
  }

  async remove(organizationId: string, resourceId: string) {
    const resource = await this.prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource || resource.ownerOrganizationId !== organizationId) {
       throw new NotFoundException('Resource not found');
    }
    return this.prisma.resource.update({
      where: { id: resourceId },
      data: { status: 'ARCHIVED' }
    });
  }
}
