import { Test, TestingModule } from '@nestjs/testing';
import { ResourcesService } from './resources.service';
import { PrismaService } from '@resourcehive/database';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ResourcesService', () => {
  let service: ResourcesService;

  const mockPrismaService = {
    resource: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourcesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ResourcesService>(ResourcesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkBookingAccess', () => {
    it('should return bookable true for an ACTIVE resource', async () => {
      // Mock findOne to return an active resource
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 'res-1',
        status: 'ACTIVE',
        name: 'Test Room',
        pointCost: 10,
        ownerOrganizationId: 'org-1',
      } as any);

      const result = await service.checkBookingAccess('org-1', 'res-1');

      expect(result.bookable).toBe(true);
      expect(result.resourceId).toBe('res-1');
      expect(result.name).toBe('Test Room');
      expect(result.pointCost).toBe(10);
      expect(result.ownerOrganizationId).toBe('org-1');
    });

    it('should throw ForbiddenException if resource is INACTIVE', async () => {
      // Mock findOne to return an inactive resource
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 'res-1',
        status: 'INACTIVE',
      } as any);

      await expect(
        service.checkBookingAccess('org-1', 'res-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('should create a resource successfully', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: 'org-1',
      });
      const createdResource = { id: 'res-1', name: 'New Room' };
      mockPrismaService.resource.create.mockResolvedValue(createdResource);

      const result = await service.create('org-1', 'user-1', {
        name: 'New Room',
        description: 'Desc',
      });

      expect(result).toEqual(createdResource);
      expect(mockPrismaService.resource.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if organization not found', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(
        service.create('org-1', 'user-1', { name: 'Room' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return a resource if the user is the owner', async () => {
      const resource = {
        id: 'res-1',
        ownerOrganizationId: 'org-1',
        allowedOrganizations: [],
      };
      mockPrismaService.resource.findUnique.mockResolvedValue(resource);

      const result = await service.findOne('org-1', 'res-1');

      expect(result).toEqual(resource);
    });

    it('should throw NotFoundException if resource not found', async () => {
      mockPrismaService.resource.findUnique.mockResolvedValue(null);

      await expect(service.findOne('org-1', 'res-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user has no access', async () => {
      const resource = {
        id: 'res-1',
        ownerOrganizationId: 'org-2',
        allowedOrganizations: [],
      };
      mockPrismaService.resource.findUnique.mockResolvedValue(resource);

      await expect(service.findOne('org-1', 'res-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findAll', () => {
    it('should return a paginated list of resources', async () => {
      const data = [{ id: 'res-1' }];
      mockPrismaService.resource.findMany.mockResolvedValue(data);
      mockPrismaService.resource.count.mockResolvedValue(1);

      const result = await service.findAll('org-1', 1, 10);

      expect(result).toEqual({
        data,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('update', () => {
    it('should update a resource', async () => {
      mockPrismaService.resource.findUnique.mockResolvedValue({
        id: 'res-1',
        ownerOrganizationId: 'org-1',
      });
      mockPrismaService.resource.update.mockResolvedValue({
        id: 'res-1',
        name: 'Updated',
      });

      const result = await service.update('org-1', 'res-1', {
        name: 'Updated',
      });

      expect(result.name).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should archive (INACTIVE) a resource', async () => {
      mockPrismaService.resource.findUnique.mockResolvedValue({
        id: 'res-1',
        ownerOrganizationId: 'org-1',
      });
      mockPrismaService.resource.update.mockResolvedValue({
        id: 'res-1',
        status: 'INACTIVE',
      });

      const result = await service.remove('org-1', 'res-1');

      expect(result.status).toBe('INACTIVE');
    });
  });
});
