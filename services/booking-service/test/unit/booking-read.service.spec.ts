import { Test, TestingModule } from '@nestjs/testing';
import { BookingReadService } from '../../src/bookings/booking-read.service';
import { PrismaService } from '@resourcehive/database';

// Mock Prisma client
const mockPrisma = {
  booking: {
    findMany: jest.fn(),
  },
} as any;

describe('BookingReadService', () => {
  let service: BookingReadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BookingReadService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<BookingReadService>(BookingReadService);
    jest.clearAllMocks();
  });

  it('should return user bookings with pagination and status', async () => {
    const dummyResult = [{ id: 'b1' }];
    mockPrisma.booking.findMany.mockResolvedValue(dummyResult);
    const query = { skip: 0, take: 10, status: 'CONFIRMED' } as any;
    const result = await service.getUserBookings('user-123', query);
    expect(mockPrisma.booking.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-123', status: 'CONFIRMED' },
      skip: 0,
      take: 10,
      include: {
        resourceSlot: {
          select: {
            startsAt: true,
            endsAt: true,
            resource: { select: { id: true, name: true, pointCost: true } },
          },
        },
      },
    });
    expect(result).toBe(dummyResult);
  });

  it('should return org bookings without status filter', async () => {
    const dummyResult = [{ id: 'b2' }];
    mockPrisma.booking.findMany.mockResolvedValue(dummyResult);
    const query = {} as any;
    const result = await service.getOrgBookings(['org-1', 'org-2'], query);
    expect(mockPrisma.booking.findMany).toHaveBeenCalledWith({
      where: {
        resourceSlot: { resource: { ownerOrganizationId: { in: ['org-1', 'org-2'] } } },
      },
      skip: undefined,
      take: undefined,
      include: {
        resourceSlot: {
          select: {
            startsAt: true,
            endsAt: true,
            resource: { select: { id: true, name: true, pointCost: true } },
          },
        },
      },
    });
    expect(result).toBe(dummyResult);
  });
});
