import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "@resourcehive/database";
import { NotificationClientService } from "@resourcehive/notification-client";
import { BookingAuthorizationService } from "../../src/authorization/booking-authorization.service";
import { BookingRepository } from "../../src/bookings/booking.repository";
import { BookingService } from "../../src/bookings/booking.service";
import { PointLedgerService } from "../../src/points/point-ledger.service";
import { SlotRepository } from "../../src/slots/slot.repository";

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

interface ResourceSlotUpdateInput {
  data: { status: string; withdrawnAt: Date | null };
  where: { id: string };
}

describe("BookingService cancellation", () => {
  const appendBookingRefund = jest.fn();
  let lastResourceSlotUpdate: ResourceSlotUpdateInput | undefined;
  const updateResourceSlot = jest.fn(
    (input: ResourceSlotUpdateInput): Promise<unknown> => {
      lastResourceSlotUpdate = input;
      return Promise.resolve({});
    },
  );
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
      update: updateResourceSlot,
    },
  };
  const prisma = {
    $transaction: jest.fn(
      async (callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    ),
  } as unknown as PrismaService;
  const points = {
    appendBookingRefund,
  } as unknown as PointLedgerService;
  const publishBookingEvent = jest.fn();
  const notifications = {
    publishBookingEvent,
  } as unknown as NotificationClientService;
  const service = new BookingService(
    prisma,
    {} as BookingAuthorizationService,
    {} as SlotRepository,
    points,
    {} as BookingRepository,
    notifications,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    lastResourceSlotUpdate = undefined;
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
    appendBookingRefund.mockReset().mockResolvedValue({});
    publishBookingEvent.mockReset().mockResolvedValue({});
  });

  it("refunds half rounded up and republishes the slot for a user cancellation", async () => {
    const result = await service.cancelBooking(booking.id, booking.userId, {
      reason: "Plans changed",
    });

    expect(result).toMatchObject({
      status: "CANCELLED",
      refundPoints: 13,
      slotStatus: "PUBLISHED",
    });
    expect(transaction.organizationMembership.findFirst).not.toHaveBeenCalled();
    expect(updateResourceSlot).toHaveBeenCalledWith({
      where: { id: booking.resourceSlotId },
      data: { status: "PUBLISHED", withdrawnAt: null },
    });
    expect(appendBookingRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: booking.userId,
        bookingId: booking.id,
        amount: 13,
      }),
      transaction,
    );
    expect(publishBookingEvent).toHaveBeenCalledWith({
      eventType: "booking.cancelled",
      bookingId: booking.id,
      userId: booking.userId,
      email: booking.user.email,
      resourceName: booking.resourceSlot.resource.name,
      refundPoints: 13,
    });
  });

  it("refunds all points and withdraws the slot for an admin cancellation", async () => {
    const result = await service.cancelBooking(booking.id, "administrator-1", {
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
    const slotUpdate = lastResourceSlotUpdate;
    expect(slotUpdate).toBeDefined();
    if (!slotUpdate) throw new Error("Expected the slot to be updated");
    expect(slotUpdate.where).toEqual({ id: booking.resourceSlotId });
    expect(slotUpdate.data.status).toBe("WITHDRAWN");
    expect(slotUpdate.data.withdrawnAt).toBeInstanceOf(Date);
    expect(appendBookingRefund).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 25 }),
      transaction,
    );
  });

  it("requires an administrator to choose the slot outcome", async () => {
    await expect(
      service.cancelBooking(booking.id, "administrator-1", {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction.booking.updateMany).not.toHaveBeenCalled();
  });

  it("rejects an administrator outside the resource organization", async () => {
    transaction.organizationMembership.findFirst.mockResolvedValue(null);

    await expect(
      service.cancelBooking(booking.id, "administrator-1", {
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
      service.cancelBooking(booking.id, booking.userId, {}),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.booking.updateMany).not.toHaveBeenCalled();
  });
});
