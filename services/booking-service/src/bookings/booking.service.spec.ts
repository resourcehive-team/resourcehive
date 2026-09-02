import { Prisma, PrismaService } from "@resourcehive/database";
import { NotificationClientService } from "@resourcehive/notification-client";
import { BookingAuthorizationService } from "../authorization/booking-authorization.service";
import { PointLedgerService } from "../points/point-ledger.service";
import { SlotRepository } from "../slots/slot.repository";
import { BookingRepository } from "./booking.repository";
import { BookingService } from "./booking.service";
import { BookingStatus } from "./bookingStatus";

describe("BookingService", () => {
  const transaction = {} as Prisma.TransactionClient;
  const resource = { findUnique: jest.fn() };
  const organizationMembership = { findMany: jest.fn() };
  const prisma = {
    $transaction: jest.fn(),
    resource,
    organizationMembership,
  } as unknown as PrismaService;
  const authorization = {
    resolve: jest.fn(),
  } as unknown as BookingAuthorizationService;
  const slots = {
    findById: jest.fn(),
    canAccessResource: jest.fn(),
  } as unknown as SlotRepository;
  const points = {
    assertSufficientBalance: jest.fn(),
    appendBookingDeduction: jest.fn(),
  } as unknown as PointLedgerService;
  const bookings = {
    createConfirmed: jest.fn(),
  } as unknown as BookingRepository;
  const sendNotification = jest.fn();
  const notifications = {
    send: sendNotification,
  } as unknown as NotificationClientService;
  const service = new BookingService(
    prisma,
    authorization,
    slots,
    points,
    bookings,
    notifications,
  );
  const user = {
    userId: "user-id",
    email: "user@example.edu",
    organizationId: "organization-id",
    role: "member",
  };
  const startsAt = new Date("2030-08-01T10:00:00.000Z");
  const endsAt = new Date("2030-08-01T11:00:00.000Z");

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(authorization, "resolve").mockResolvedValue({
      userId: "user-id",
      organizationId: "organization-id",
      rootOrganizationId: "root-id",
      role: "MEMBER",
    });
    jest.spyOn(slots, "findById").mockResolvedValue({
      id: "slot-id",
      resourceId: "resource-id",
      startsAt,
      endsAt,
      status: "PUBLISHED",
      withdrawnAt: null,
      createdAt: new Date(),
      resource: {
        id: "resource-id",
        name: "Room",
        status: "ACTIVE",
        rootOrganizationId: "root-id",
        ownerOrganizationId: "organization-id",
        pointCost: 25,
      },
      bookings: [],
    });
    jest.spyOn(slots, "canAccessResource").mockResolvedValue(true);
    jest.spyOn(points, "assertSufficientBalance").mockResolvedValue(100);
    resource.findUnique.mockResolvedValue({
      ownerOrganizationId: "organization-id",
    });
    organizationMembership.findMany.mockResolvedValue([
      { userId: "administrator-id" },
    ]);
    sendNotification.mockResolvedValue({});
  });

  it("validates a bookable slot using server-derived values", async () => {
    await expect(service.validateBooking("slot-id", user)).resolves.toEqual({
      userId: "user-id",
      rootOrganizationId: "root-id",
      resourceId: "resource-id",
      resourceSlotId: "slot-id",
      pointCost: 25,
      startsAt,
      endsAt,
    });
  });

  it("creates a confirmed booking and deducts its points atomically", async () => {
    const appendBookingDeduction = jest.spyOn(points, "appendBookingDeduction");
    jest
      .spyOn(prisma, "$transaction")
      .mockImplementation(async (callback: never) =>
        (callback as (client: Prisma.TransactionClient) => Promise<unknown>)(
          transaction,
        ),
      );
    jest.spyOn(bookings, "createConfirmed").mockResolvedValue({
      id: "booking-id",
      resourceSlotId: "slot-id",
      userId: "user-id",
      status: BookingStatus.CONFIRMED,
      createdAt: new Date("2026-08-01T09:00:00.000Z"),
      resourceSlot: {
        startsAt,
        endsAt,
        resource: { id: "resource-id", name: "Room", pointCost: 25 },
      },
    });

    await expect(service.createBooking("slot-id", user)).resolves.toMatchObject(
      {
        id: "booking-id",
        status: BookingStatus.CONFIRMED,
        pointsDeducted: 25,
      },
    );
    expect(appendBookingDeduction).toHaveBeenCalledWith(
      expect.objectContaining({ amount: -25, bookingId: "booking-id" }),
      transaction,
    );
    expect(sendNotification).toHaveBeenCalledWith({
      recipientUserId: "administrator-id",
      title: "New booking",
      message: "user@example.edu booked Room.",
      correlationId: "booking-id",
    });
  });
});
