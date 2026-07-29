import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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

    const allowedOrgsData = dto.allowedOrganizationIds?.map(id => ({
      organizationId: id,
      rootOrganizationId: rootOrgId
    })) || [];

    return this.prisma.resource.create({
      data: {
        name: dto.name,
        description: dto.description,
        pointCost: dto.pointCost || 0,
        ownerOrganizationId: organizationId,
        rootOrganizationId: rootOrgId,
        createdByUserId: userId,
        allowedOrganizations: {
          create: allowedOrgsData
        }
      },
      include: { allowedOrganizations: true }
    });
  }

  async findAll(organizationId: string) {
    const whereClause: any = {
      OR: [
        { ownerOrganizationId: organizationId },
        { allowedOrganizations: { some: { organizationId } } }
      ]
    };

    return this.prisma.resource.findMany({
      where: whereClause,
      include: { allowedOrganizations: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(organizationId: string, resourceId: string) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      include: { allowedOrganizations: true, ownerOrganization: true }
    });
    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    const isOwner = resource.ownerOrganizationId === organizationId;
    const isAllowed = resource.allowedOrganizations.some(ao => ao.organizationId === organizationId);
    
    if (!isOwner && !isAllowed) {
      throw new ForbiddenException('You do not have access to this resource');
    }

    return resource;
  }

  async update(organizationId: string, resourceId: string, dto: UpdateResourceDto) {
    const resource = await this.prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource || resource.ownerOrganizationId !== organizationId) {
       throw new NotFoundException('Resource not found');
    }

    const { allowedOrganizationIds, ...rest } = dto;

    let allowedOrganizationsUpdate = {};
    if (allowedOrganizationIds) {
      const rootOrgId = resource.rootOrganizationId;
      allowedOrganizationsUpdate = {
        deleteMany: {},
        create: allowedOrganizationIds.map(id => ({
          organizationId: id,
          rootOrganizationId: rootOrgId
        }))
      };
    }

    return this.prisma.resource.update({
      where: { id: resourceId },
      data: {
        ...rest,
        allowedOrganizations: allowedOrganizationsUpdate
      },
      include: { allowedOrganizations: true }
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
