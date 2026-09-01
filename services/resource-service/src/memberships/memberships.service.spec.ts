import { Test, TestingModule } from '@nestjs/testing';
import { MembershipsService } from './memberships.service';
import { PrismaService } from '@resourcehive/database';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('MembershipsService', () => {
  let service: MembershipsService;

  const mockPrismaService = {
    organizationMembership: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MembershipsService>(MembershipsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('requestMembership', () => {
    it('should create a pending membership request', async () => {
      mockPrismaService.organizationMembership.findUnique.mockResolvedValue(
        null,
      );
      const expectedResult = {
        userId: 'u1',
        organizationId: 'o1',
        status: 'PENDING',
      };
      mockPrismaService.organizationMembership.create.mockResolvedValue(
        expectedResult,
      );

      const result = await service.requestMembership('u1', 'o1');

      expect(result).toEqual(expectedResult);
      expect(
        mockPrismaService.organizationMembership.create,
      ).toHaveBeenCalledWith({
        data: {
          userId: 'u1',
          organizationId: 'o1',
          status: 'PENDING',
          role: 'MEMBER',
        },
      });
    });

    it('should throw ConflictException if membership already exists', async () => {
      mockPrismaService.organizationMembership.findUnique.mockResolvedValue({
        id: 'existing',
      });

      await expect(service.requestMembership('u1', 'o1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('updateMembershipStatus', () => {
    it('should update membership status', async () => {
      mockPrismaService.organizationMembership.findUnique.mockResolvedValue({
        id: 'existing',
      });
      const expectedResult = { status: 'APPROVED', approvedBy: 'admin' };
      mockPrismaService.organizationMembership.update.mockResolvedValue(
        expectedResult,
      );

      const result = await service.updateMembershipStatus(
        'u1',
        'o1',
        'APPROVED',
        'admin',
      );

      expect(result).toEqual(expectedResult);
      expect(
        mockPrismaService.organizationMembership.update,
      ).toHaveBeenCalledWith({
        where: {
          userId_organizationId: { userId: 'u1', organizationId: 'o1' },
        },
        data: { status: 'APPROVED', approvedBy: 'admin' },
      });
    });

    it('should throw NotFoundException if membership does not exist', async () => {
      mockPrismaService.organizationMembership.findUnique.mockResolvedValue(
        null,
      );

      await expect(
        service.updateMembershipStatus('u1', 'o1', 'APPROVED', 'admin'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
