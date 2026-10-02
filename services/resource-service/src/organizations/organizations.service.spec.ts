import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '@resourcehive/database';

describe('OrganizationsService', () => {
  let service: OrganizationsService;

  const mockPrismaService = {
    organization: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: { findUnique: jest.fn() },
    organizationEmailDomain: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    organizationEmailAllowlist: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    organizationMembership: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    organizationMembershipAudit: { create: jest.fn() },
    pointTransaction: {
      createMany: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
    mockPrismaService.$transaction.mockImplementation((cb: any) =>
      cb(mockPrismaService),
    );
    /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllRoots', () => {
    it('should return all root organizations', async () => {
      const result = [{ id: '1', name: 'Root 1' }];
      mockPrismaService.organization.findMany.mockResolvedValue(result);

      expect(await service.findAllRoots()).toEqual(result);
      expect(mockPrismaService.organization.findMany).toHaveBeenCalledWith({
        where: { parentId: null },
      });
    });
  });

  describe('findOne', () => {
    it('should return a single organization with children', async () => {
      const result = { id: '1', name: 'Org 1', children: [] };
      mockPrismaService.organization.findUnique.mockResolvedValue(result);

      expect(await service.findOne('1')).toEqual(result);
      expect(mockPrismaService.organization.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: { children: true },
      });
    });
  });

  describe('createChildOrganization', () => {
    it('creates a child and assigns its first admin with an audit entry', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: 'faculty',
        rootOrganizationId: 'university',
        status: 'ACTIVE',
      });
      mockPrismaService.organization.findMany.mockResolvedValue([
        { id: 'university', parentId: null, status: 'ACTIVE' },
        { id: 'faculty', parentId: 'university', status: 'ACTIVE' },
      ]);
      mockPrismaService.organizationMembership.findFirst
        .mockResolvedValueOnce({ role: 'ADMIN', status: 'APPROVED' })
        .mockResolvedValueOnce({ role: 'MEMBER', status: 'APPROVED' });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'admin-user',
        email: 'first.admin@example.edu',
        status: 'ACTIVE',
        platformRole: 'USER',
        emailVerifiedAt: new Date(),
      });
      mockPrismaService.organization.create.mockResolvedValue({
        id: 'department',
        name: 'Computer Science',
        type: 'DEPARTMENT',
        parentId: 'faculty',
        rootOrganizationId: 'university',
      });
      mockPrismaService.organizationMembership.create.mockResolvedValue({
        id: 'new-membership',
      });

      const result = await service.createChildOrganization(
        'faculty',
        {
          name: ' Computer Science ',
          type: 'DEPARTMENT',
          adminEmail: ' FIRST.ADMIN@EXAMPLE.EDU ',
        },
        'faculty-admin',
      );

      expect(result.administrator.email).toBe('first.admin@example.edu');
      expect(mockPrismaService.organization.create).toHaveBeenCalled();
      expect(
        mockPrismaService.organizationMembership.create,
      ).toHaveBeenCalled();
      expect(
        mockPrismaService.organizationMembershipAudit.create,
      ).toHaveBeenCalledWith({
        data: {
          membershipId: 'new-membership',
          actorUserId: 'faculty-admin',
          action: 'ADMIN_GRANTED',
        },
      });
    });

    it('rejects an assignee who is not already an approved member of the university', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: 'faculty',
        rootOrganizationId: 'university',
        status: 'ACTIVE',
      });
      mockPrismaService.organization.findMany.mockResolvedValue([
        { id: 'university', parentId: null, status: 'ACTIVE' },
        { id: 'faculty', parentId: 'university', status: 'ACTIVE' },
      ]);
      mockPrismaService.organizationMembership.findFirst
        .mockResolvedValueOnce({ role: 'ADMIN', status: 'APPROVED' })
        .mockResolvedValueOnce(null);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'outside-user',
        email: 'outside@example.edu',
        status: 'ACTIVE',
        platformRole: 'USER',
        emailVerifiedAt: new Date(),
      });

      await expect(
        service.createChildOrganization(
          'faculty',
          {
            name: 'Department',
            type: 'DEPARTMENT',
            adminEmail: 'outside@example.edu',
          },
          'faculty-admin',
        ),
      ).rejects.toThrow('approved member of this university');
      expect(mockPrismaService.organization.create).not.toHaveBeenCalled();
    });

    it('rejects creation when an ancestor is inactive', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: 'faculty',
        rootOrganizationId: 'university',
        status: 'ACTIVE',
      });
      mockPrismaService.organization.findMany.mockResolvedValue([
        { id: 'university', parentId: null, status: 'SUSPENDED' },
        { id: 'faculty', parentId: 'university', status: 'ACTIVE' },
      ]);

      await expect(
        service.createChildOrganization(
          'faculty',
          {
            name: 'Department',
            type: 'DEPARTMENT',
            adminEmail: 'first.admin@example.edu',
          },
          'faculty-admin',
        ),
      ).rejects.toThrow('parent organization hierarchy must be active');
      expect(mockPrismaService.organization.create).not.toHaveBeenCalled();
    });
  });

  // Minimal tests for other domains to ensure coverage without being exhaustive
  describe('addEmailDomain', () => {
    it('should add an email domain', async () => {
      const result = { id: 'domain1', domain: 'example.com' };
      mockPrismaService.organizationEmailDomain.create.mockResolvedValue(
        result,
      );

      expect(
        await service.addEmailDomain('org1', ' Example.COM ', true),
      ).toEqual(result);
      expect(
        mockPrismaService.organizationEmailDomain.create,
      ).toHaveBeenCalledWith({
        data: { organizationId: 'org1', domain: 'example.com', autoJoin: true },
      });
    });
  });

  describe('update', () => {
    it('should update organization details', async () => {
      const dto = { status: 'SUSPENDED', name: 'New Name' };
      const result = { id: 'org1', ...dto };
      mockPrismaService.organization.update.mockResolvedValue(result);

      expect(await service.update('org1', dto)).toEqual(result);
      expect(mockPrismaService.organization.update).toHaveBeenCalledWith({
        where: { id: 'org1' },
        data: dto,
      });
    });
  });

  describe('allocateSemesterPoints', () => {
    it('should allocate points to all active members of target and its descendants', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({
        rootOrganizationId: 'root-org',
      });
      mockPrismaService.organization.findMany.mockResolvedValue([
        { id: 'target-org', parentId: null },
        { id: 'child-org', parentId: 'target-org' },
        { id: 'other-org', parentId: null },
      ]);
      mockPrismaService.pointTransaction.findFirst.mockResolvedValue(null);

      mockPrismaService.organizationMembership.findMany.mockResolvedValue([
        { userId: 'user1', organizationId: 'target-org' },
        { userId: 'user2', organizationId: 'target-org' },
        { userId: 'user1', organizationId: 'target-org' }, // duplicate user simulating overlapping membership
      ]);
      mockPrismaService.pointTransaction.createMany.mockResolvedValue({
        count: 2,
      });

      const result = await service.allocateSemesterPoints(
        'root-org',
        ['target-org'],
        500,
        'Semester-1/2026',
      );

      expect(result).toEqual({ count: 2 });

      // Should have found descendants target-org and child-org
      expect(
        mockPrismaService.organizationMembership.findMany,
      ).toHaveBeenCalledWith({
        where: {
          organizationId: { in: ['target-org', 'child-org'] },
          status: 'APPROVED',
        },
      });

      expect(
        mockPrismaService.pointTransaction.createMany,
      ).toHaveBeenCalledWith({
        data: [
          {
            userId: 'user1',
            rootOrganizationId: 'root-org',
            amount: 500,
            transactionType: 'SEMESTER_ALLOCATION',
            sourceOrganizationId: 'target-org',
            description: 'Semester-1/2026',
          },
          {
            userId: 'user2',
            rootOrganizationId: 'root-org',
            amount: 500,
            transactionType: 'SEMESTER_ALLOCATION',
            sourceOrganizationId: 'target-org',
            description: 'Semester-1/2026',
          },
        ],
      });
    });

    it('should throw ConflictException if points already allocated to target organization', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({
        rootOrganizationId: 'root-org',
      });
      mockPrismaService.organization.findMany.mockResolvedValue([
        { id: 'target-org', parentId: null },
      ]);
      mockPrismaService.organizationMembership.findMany.mockResolvedValue([
        { userId: 'user1' },
      ]);
      mockPrismaService.pointTransaction.findFirst.mockResolvedValue({
        id: 'existing-tx',
      });

      await expect(
        service.allocateSemesterPoints(
          'root-org',
          ['target-org'],
          500,
          'Semester-1/2026',
        ),
      ).rejects.toThrow(
        "Semester points for 'Semester-1/2026' have already been allocated to one or more selected organizations.",
      );
    });

    it('should return count 0 if no active members exist', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({
        rootOrganizationId: 'root-org',
      });
      mockPrismaService.organization.findMany.mockResolvedValue([
        { id: 'target-org', parentId: null },
      ]);
      mockPrismaService.organizationMembership.findMany.mockResolvedValue([]);

      const result = await service.allocateSemesterPoints(
        'root-org',
        ['target-org'],
        500,
        'Semester-1/2026',
      );

      expect(result).toEqual({ count: 0 });
      expect(
        mockPrismaService.pointTransaction.createMany,
      ).not.toHaveBeenCalled();
    });
  });
});
