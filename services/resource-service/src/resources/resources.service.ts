import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, PrismaService } from '@resourcehive/database';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

@Injectable()
export class ResourcesService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, userId: string, dto: CreateResourceDto) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const rootOrgId = org.rootOrganizationId || org.id;

    const allowedOrganizationIds = [
      ...new Set([organizationId, ...(dto.allowedOrganizationIds ?? [])]),
    ];
    const allowedOrgsData = allowedOrganizationIds.map((id) => ({
      organizationId: id,
    }));

    return this.prisma.resource.create({
      data: {
        name: dto.name,
        description: dto.description,
        pointCost: dto.pointCost ?? 0,
        ownerOrganizationId: organizationId,
        rootOrganizationId: rootOrgId,
        createdByUserId: userId,
        allowedOrganizations: {
          create: allowedOrgsData,
        },
      },
      include: { allowedOrganizations: true },
    });
  }

  async findAll(
    organizationId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
  ) {
    const skip = (page - 1) * limit;

    const whereClause: Prisma.ResourceWhereInput = {
      OR: [
        { ownerOrganizationId: organizationId },
        { allowedOrganizations: { some: { organizationId } } },
      ],
    };

    if (search) {
      whereClause.name = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.resource.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { allowedOrganizations: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.resource.count({ where: whereClause }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(organizationId: string, resourceId: string) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      include: { allowedOrganizations: true, ownerOrganization: true },
    });
    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    const isOwner = resource.ownerOrganizationId === organizationId;
    const isAllowed = resource.allowedOrganizations.some(
      (ao) => ao.organizationId === organizationId,
    );

    if (!isOwner && !isAllowed) {
      throw new ForbiddenException('You do not have access to this resource');
    }

    return resource;
  }

  async update(
    organizationId: string,
    resourceId: string,
    dto: UpdateResourceDto,
  ) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
    });
    if (!resource || resource.ownerOrganizationId !== organizationId) {
      throw new NotFoundException('Resource not found');
    }

    const { allowedOrganizationIds, ...rest } =
      dto as Partial<CreateResourceDto> & UpdateResourceDto;

    let allowedOrganizationsUpdate = {};
    if (allowedOrganizationIds) {
      const allowedOrganizationIdsWithOwner = [
        ...new Set([organizationId, ...allowedOrganizationIds]),
      ];
      allowedOrganizationsUpdate = {
        deleteMany: {},
        create: allowedOrganizationIdsWithOwner.map((id) => ({
          organizationId: id,
        })),
      };
    }

    return this.prisma.resource.update({
      where: { id: resourceId },
      data: {
        ...rest,
        allowedOrganizations: allowedOrganizationsUpdate,
      },
      include: { allowedOrganizations: true },
    });
  }

  async remove(organizationId: string, resourceId: string) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
    });
    if (!resource || resource.ownerOrganizationId !== organizationId) {
      throw new NotFoundException('Resource not found');
    }
    return this.prisma.resource.update({
      where: { id: resourceId },
      data: { status: 'INACTIVE' },
    });
  }

  async uploadImage(
    organizationId: string,
    resourceId: string,
    imageUrl: string,
  ) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
    });
    if (!resource || resource.ownerOrganizationId !== organizationId) {
      throw new NotFoundException('Resource not found');
    }
    return this.prisma.resource.update({
      where: { id: resourceId },
      data: { imageUrl },
    });
  }

  async checkBookingAccess(organizationId: string, resourceId: string) {
    const resource = await this.findOne(organizationId, resourceId);

    if (resource.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'This resource is not active and cannot be booked',
      );
    }

    return {
      bookable: true,
      resourceId: resource.id,
      name: resource.name,
      pointCost: resource.pointCost,
      ownerOrganizationId: resource.ownerOrganizationId,
    };
  }

  async upsertRating(
    organizationId: string,
    resourceId: string,
    userId: string,
    rating: number,
    comment?: string,
  ) {
    // Check if user has access to the resource
    await this.findOne(organizationId, resourceId);

    return this.prisma.resourceRating.upsert({
      where: {
        resourceId_userId: {
          resourceId,
          userId,
        },
      },
      update: {
        rating,
        comment,
      },
      create: {
        resourceId,
        userId,
        rating,
        comment,
      },
    });
  }

  async getRatings(organizationId: string, resourceId: string) {
    // Check access first
    await this.findOne(organizationId, resourceId);

    const ratings = await this.prisma.resourceRating.findMany({
      where: { resourceId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    const average =
      ratings.length > 0
        ? ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length
        : 0;

    return {
      average,
      total: ratings.length,
      ratings,
    };
  }
}
