import { ForbiddenException } from "@nestjs/common";
import { PrismaService } from "@resourcehive/database";
import { BookingAuthorizationService } from "../../src/authorization/booking-authorization.service";
import { BookingRepository } from "../../src/bookings/booking.repository";
import { BookingService } from "../../src/bookings/booking.service";
import {
  GetOrgBookingsDto,
  GetUserBookingsDto,
} from "../../src/bookings/bookings.dto";
import { PointLedgerService } from "../../src/points/point-ledger.service";
import { SlotRepository } from "../../src/slots/slot.repository";

interface MockPrisma {
  booking: {
    findMany: jest.Mock;
  };
  organizationMembership: {
    findMany: jest.Mock;
  };
}

const mockPrisma: MockPrisma = {
  booking: {
    findMany: jest.fn(),
  },
  organizationMembership: {
    findMany: jest.fn(),
  },
};

describe("BookingService reads", () => {
  const service = new BookingService(
    mockPrisma as unknown as PrismaService,
    {} as BookingAuthorizationService,
    {} as SlotRepository,
    {} as PointLedgerService,
    {} as BookingRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return user bookings with pagination and status", async () => {
    const dummyResult = [{ id: "b1" }];
    mockPrisma.booking.findMany.mockResolvedValue(dummyResult);
    const query: GetUserBookingsDto = {
      skip: 0,
      take: 10,
      status: "CONFIRMED" as never,
    };
    const result = await service.getUserBookings("user-123", query);
    expect(mockPrisma.booking.findMany).toHaveBeenCalledWith({
      where: { userId: "user-123", status: "CONFIRMED" },
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

  it("should return org bookings without status filter", async () => {
    const dummyResult = [{ id: "b2" }];
    mockPrisma.organizationMembership.findMany.mockResolvedValue([
      { organizationId: "org-1" },
      { organizationId: "org-2" },
    ]);
    mockPrisma.booking.findMany.mockResolvedValue(dummyResult);
    const query: GetOrgBookingsDto = {};
    const result = await service.getOrgBookings("user-123", query);

    expect(mockPrisma.organizationMembership.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-123",
        role: "ADMIN",
        status: "APPROVED",
      },
      select: { organizationId: true },
    });
    expect(mockPrisma.booking.findMany).toHaveBeenCalledWith({
      where: {
        resourceSlot: {
          resource: { ownerOrganizationId: { in: ["org-1", "org-2"] } },
        },
      },
      skip: undefined,
      take: undefined,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            status: true,
            emailVerifiedAt: true,
            createdAt: true,
          },
        },
        resourceSlot: {
          select: {
            startsAt: true,
            endsAt: true,
            status: true,
            resource: {
              select: {
                id: true,
                name: true,
                pointCost: true,
                ownerOrganizationId: true,
              },
            },
          },
        },
      },
    });
    expect(result).toBe(dummyResult);
  });

  it("should reject users without an approved administrator membership", async () => {
    mockPrisma.organizationMembership.findMany.mockResolvedValue([]);

    await expect(service.getOrgBookings("user-123", {})).rejects.toThrow(
      ForbiddenException,
    );
    expect(mockPrisma.booking.findMany).not.toHaveBeenCalled();
  });
});
