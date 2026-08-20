import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@resourcehive/database";
import { BookingCompletionService } from "../../src/bookings/booking-completion.service";

const booking = {
  id: "d5000000-0000-4000-8000-000000000001",
  resourceSlotId: "d4000000-0000-4000-8000-000000000001",
  userId: "d1000000-0000-4000-8000-000000000001",
  status: "CONFIRMED",
  createdAt: new Date("2026-08-20T08:00:00.000Z"),
  cancelledAt: null,
  completedAt: null,
  user: {
    firstName: "Alice",
    lastName: "Perera",
    email: "alice@example.edu",
    status: "ACTIVE",
    emailVerifiedAt: new Date("2026-08-01T00:00:00.000Z"),
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
  },
  resourceSlot: {
    startsAt: new Date("2026-08-20T09:00:00.000Z"),
    endsAt: new Date("2026-08-20T10:00:00.000Z"),
    resource: {
      id: "d3000000-0000-4000-8000-000000000001",
      name: "Engineering Robotics Lab",
      pointCost: 25,
      ownerOrganizationId: "d2000000-0000-4000-8000-000000000001",
    },
  },
};

describe("BookingCompletionService", () => {
  const prisma = {
    booking: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    organizationMembership: {
      findFirst: jest.fn(),
    },
  };
  const service = new BookingCompletionService(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.booking.findUnique.mockResolvedValue(booking);
    prisma.organizationMembership.findFirst.mockResolvedValue({
      id: "membership-1",
    });
  });

  it("marks a confirmed organization booking as completed", async () => {
    const completedBooking = {
      ...booking,
      status: "COMPLETED",
      completedAt: new Date("2026-08-20T10:00:00.000Z"),
    };
    prisma.booking.update.mockResolvedValue(completedBooking);

    await expect(service.complete(booking.id, "administrator-1")).resolves.toBe(
      completedBooking,
    );

    expect(prisma.organizationMembership.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "administrator-1",
        organizationId: booking.resourceSlot.resource.ownerOrganizationId,
        role: "ADMIN",
        status: "APPROVED",
      },
      select: { id: true },
    });
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: booking.id },
        data: {
          status: "COMPLETED",
          completedAt: expect.any(Date),
        },
      }),
    );
  });

  it("rejects a user who does not administer the resource organization", async () => {
    prisma.organizationMembership.findFirst.mockResolvedValue(null);

    await expect(
      service.complete(booking.id, "member-1"),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });

  it("rejects a cancelled booking", async () => {
    prisma.booking.findUnique.mockResolvedValue({
      ...booking,
      status: "CANCELLED",
      cancelledAt: new Date("2026-08-20T08:30:00.000Z"),
    });

    await expect(
      service.complete(booking.id, "administrator-1"),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });

  it("rejects an unknown booking", async () => {
    prisma.booking.findUnique.mockResolvedValue(null);

    await expect(
      service.complete(booking.id, "administrator-1"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.organizationMembership.findFirst).not.toHaveBeenCalled();
  });
});
