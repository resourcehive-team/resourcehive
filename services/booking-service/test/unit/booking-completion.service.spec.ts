import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
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

interface BookingUpdateInput {
  data: { completedAt: Date; status: string };
  where: { id: string };
}

describe("BookingService completion", () => {
  let bookingUpdate: BookingUpdateInput | undefined;
  let bookingUpdateResult: unknown;
  const updateBooking = jest.fn(
    (input: BookingUpdateInput): Promise<unknown> => {
      bookingUpdate = input;
      return Promise.resolve(bookingUpdateResult);
    },
  );
  const prisma = {
    booking: {
      findUnique: jest.fn(),
      update: updateBooking,
    },
    organizationMembership: {
      findFirst: jest.fn(),
    },
  };
  const publishBookingEvent = jest.fn();
  const notifications = {
    publishBookingEvent,
  } as unknown as NotificationClientService;
  const service = new BookingService(
    prisma as unknown as PrismaService,
    {} as BookingAuthorizationService,
    {} as SlotRepository,
    {} as PointLedgerService,
    {} as BookingRepository,
    notifications,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    bookingUpdate = undefined;
    bookingUpdateResult = undefined;
    prisma.booking.findUnique.mockResolvedValue(booking);
    prisma.organizationMembership.findFirst.mockResolvedValue({
      id: "membership-1",
    });
    publishBookingEvent.mockResolvedValue({});
  });

  it("marks a confirmed organization booking as completed", async () => {
    const completedBooking = {
      ...booking,
      status: "COMPLETED",
      completedAt: new Date("2026-08-20T10:00:00.000Z"),
    };
    bookingUpdateResult = completedBooking;

    await expect(
      service.completeBooking(booking.id, "administrator-1"),
    ).resolves.toBe(completedBooking);

    expect(prisma.organizationMembership.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "administrator-1",
        organizationId: booking.resourceSlot.resource.ownerOrganizationId,
        role: "ADMIN",
        status: "APPROVED",
      },
      select: { id: true },
    });
    const update = bookingUpdate;
    expect(update).toBeDefined();
    if (!update) throw new Error("Expected the booking to be updated");
    expect(update.where).toEqual({ id: booking.id });
    expect(update.data.status).toBe("COMPLETED");
    expect(update.data.completedAt).toBeInstanceOf(Date);
    expect(publishBookingEvent).toHaveBeenCalledWith({
      eventType: "booking.completed",
      bookingId: booking.id,
      userId: booking.userId,
      email: booking.user.email,
      resourceName: booking.resourceSlot.resource.name,
    });
  });

  it("rejects a user who does not administer the resource organization", async () => {
    prisma.organizationMembership.findFirst.mockResolvedValue(null);

    await expect(
      service.completeBooking(booking.id, "member-1"),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(updateBooking).not.toHaveBeenCalled();
  });

  it("rejects a cancelled booking", async () => {
    prisma.booking.findUnique.mockResolvedValue({
      ...booking,
      status: "CANCELLED",
      cancelledAt: new Date("2026-08-20T08:30:00.000Z"),
    });

    await expect(
      service.completeBooking(booking.id, "administrator-1"),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(updateBooking).not.toHaveBeenCalled();
  });

  it("rejects an unknown booking", async () => {
    prisma.booking.findUnique.mockResolvedValue(null);

    await expect(
      service.completeBooking(booking.id, "administrator-1"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.organizationMembership.findFirst).not.toHaveBeenCalled();
  });
});
