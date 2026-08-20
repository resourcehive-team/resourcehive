import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "@resourcehive/database";
import { BookingCancellationService } from "../../src/bookings/booking-cancellation.service";
import { PointLedgerService } from "../../src/points/point-ledger.service";

const booking = {
  id: "d5000000-0000-4000-8000-000000000001",
  resourceSlotId: "d4000000-0000-4000-8000-000000000001",
  userId: "d1000000-0000-4000-8000-000000000001",
  status: "CONFIRMED",
  createdAt: new Date("2026-08-20T08:00:00.000Z"),
  cancelledAt: null,
  cancelledByUserId: null,
  cancellationReason: null,
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
    startsAt: new Date("2030-08-20T09:00:00.000Z"),
    endsAt: new Date("2030-08-20T10:00:00.000Z"),
    status: "PUBLISHED",
    resource: {
      id: "d3000000-0000-4000-8000-000000000001",
      name: "Engineering Robotics Lab",
      pointCost: 25,
      ownerOrganizationId: "d2000000-0000-4000-8000-000000000001",
    },
  },
};

describe("BookingCancellationService", () => {
  const transaction = {
    booking: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    organizationMembership: {
      findFirst: jest.fn(),
    },
    pointTransaction: {
      findFirst: jest.fn(),
    },
    resourceSlot: {
      update: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn(
      async (callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    ),
  } as unknown as PrismaService;
  const points = {
    appendBookingRefund: jest.fn(),
  } as unknown as PointLedgerService;
  const service = new BookingCancellationService(prisma, points);

  beforeEach(() => {
    jest.clearAllMocks();
    transaction.booking.findUnique
      .mockReset()
      .mockResolvedValueOnce(booking)
      .mockResolvedValueOnce({
        ...booking,
        status: "CANCELLED",
        cancelledAt: new Date(),
      });
    transaction.booking.updateMany.mockReset().mockResolvedValue({ count: 1 });
    transaction.organizationMembership.findFirst
      .mockReset()
      .mockResolvedValue({ id: "membership-1" });
    transaction.pointTransaction.findFirst
      .mockReset()
      .mockResolvedValue({ amount: -25 });
    transaction.resourceSlot.update.mockReset().mockResolvedValue({});
    jest.spyOn(points, "appendBookingRefund").mockResolvedValue({} as never);
  });

  it("refunds half rounded up and republishes the slot for a user cancellation", async () => {
    const result = await service.cancel(booking.id, booking.userId, {
      reason: "Plans changed",
    });

    expect(result).toMatchObject({
      status: "CANCELLED",
      refundPoints: 13,
      slotStatus: "PUBLISHED",
    });
    expect(transaction.organizationMembership.findFirst).not.toHaveBeenCalled();
    expect(transaction.resourceSlot.update).toHaveBeenCalledWith({
      where: { id: booking.resourceSlotId },
      data: { status: "PUBLISHED", withdrawnAt: null },
    });
    expect(points.appendBookingRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: booking.userId,
        bookingId: booking.id,
        amount: 13,
      }),
      transaction,
    );
  });

  it("refunds all points and withdraws the slot for an admin cancellation", async () => {
    const result = await service.cancel(booking.id, "administrator-1", {
      makeSlotAvailable: false,
      reason: "Resource unavailable",
    });

    expect(result).toMatchObject({
      status: "CANCELLED",
      refundPoints: 25,
      slotStatus: "WITHDRAWN",
    });
    expect(transaction.organizationMembership.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "administrator-1",
        organizationId: booking.resourceSlot.resource.ownerOrganizationId,
        role: "ADMIN",
        status: "APPROVED",
      },
      select: { id: true },
    });
    expect(transaction.resourceSlot.update).toHaveBeenCalledWith({
      where: { id: booking.resourceSlotId },
      data: { status: "WITHDRAWN", withdrawnAt: expect.any(Date) },
    });
    expect(points.appendBookingRefund).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 25 }),
      transaction,
    );
  });

  it("requires an administrator to choose the slot outcome", async () => {
    await expect(
      service.cancel(booking.id, "administrator-1", {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction.booking.updateMany).not.toHaveBeenCalled();
  });

  it("rejects an administrator outside the resource organization", async () => {
    transaction.organizationMembership.findFirst.mockResolvedValue(null);

    await expect(
      service.cancel(booking.id, "administrator-1", {
        makeSlotAvailable: true,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction.booking.updateMany).not.toHaveBeenCalled();
  });

  it("does not let a user cancel after the slot starts", async () => {
    transaction.booking.findUnique.mockReset().mockResolvedValue({
      ...booking,
      resourceSlot: {
        ...booking.resourceSlot,
        startsAt: new Date("2020-08-20T09:00:00.000Z"),
      },
    });

    await expect(
      service.cancel(booking.id, booking.userId, {}),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.booking.updateMany).not.toHaveBeenCalled();
  });
});
