import { Prisma, PrismaService } from "@resourcehive/database";
import { PointLedgerService } from "../points/point-ledger.service";
import { BookingConcurrentConflictError } from "./booking-creation.errors";
import { BookingCreationService } from "./booking-creation.service";
import { BookingRepository } from "./booking.repository";
import { BookingValidationService } from "./booking-validation.service";

describe("BookingCreationService", () => {
  const transaction = {};
  const runTransaction = jest.fn();
  const prisma = {
    $transaction: runTransaction,
  } as unknown as PrismaService;
  const validate = jest.fn();
  const validation = {
    validate,
  } as unknown as BookingValidationService;
  const createConfirmed = jest.fn();
  const bookings = {
    createConfirmed,
  } as unknown as BookingRepository;
  const appendBookingDeduction = jest.fn();
  const points = {
    appendBookingDeduction,
  } as unknown as PointLedgerService;
  const service = new BookingCreationService(
    prisma,
    validation,
    bookings,
    points,
  );
  const user = {
    userId: "user-id",
    email: "user@example.edu",
    organizationId: "organization-id",
    role: "member",
  };
  const context = {
    userId: "user-id",
    rootOrganizationId: "root-id",
    resourceId: "resource-id",
    resourceSlotId: "slot-id",
    pointCost: 25,
    startsAt: new Date("2030-08-01T10:00:00.000Z"),
    endsAt: new Date("2030-08-01T11:00:00.000Z"),
  };
  const booking = {
    id: "booking-id",
    resourceSlotId: "slot-id",
    userId: "user-id",
    status: "CONFIRMED",
    createdAt: new Date("2026-08-01T09:00:00.000Z"),
    resourceSlot: {
      startsAt: context.startsAt,
      endsAt: context.endsAt,
      resource: {
        id: "resource-id",
        name: "Projector",
        pointCost: 25,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    runTransaction.mockImplementation(async (callback: never) =>
      (callback as (client: object) => Promise<unknown>)(transaction),
    );
    validate.mockResolvedValue(context);
    createConfirmed.mockResolvedValue(booking);
    appendBookingDeduction.mockResolvedValue({
      id: "transaction-id",
      userId: "user-id",
      amount: -25,
      transactionType: "BOOKING",
      bookingId: "booking-id",
      description: "Booking for Projector",
      createdAt: new Date(),
    });
  });

  it("creates the booking and deduction in one serializable transaction", async () => {
    await expect(service.create("slot-id", user)).resolves.toEqual({
      id: "booking-id",
      resourceSlotId: "slot-id",
      resourceId: "resource-id",
      resourceName: "Projector",
      userId: "user-id",
      status: "CONFIRMED",
      startsAt: context.startsAt,
      endsAt: context.endsAt,
      pointsDeducted: 25,
      createdAt: booking.createdAt,
    });
    expect(validate).toHaveBeenCalledWith("slot-id", user, transaction);
    expect(createConfirmed).toHaveBeenCalledWith(
      { resourceSlotId: "slot-id", userId: "user-id" },
      transaction,
    );
    expect(appendBookingDeduction).toHaveBeenCalledWith(
      {
        userId: "user-id",
        bookingId: "booking-id",
        amount: -25,
        description: "Booking for Projector",
      },
      transaction,
    );
    expect(runTransaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it("does not append a zero-value ledger entry for a free booking", async () => {
    validate.mockResolvedValue({
      ...context,
      pointCost: 0,
    });

    await expect(service.create("slot-id", user)).resolves.toMatchObject({
      pointsDeducted: 0,
    });
    expect(appendBookingDeduction).not.toHaveBeenCalled();
  });

  it("propagates deduction failures so the transaction can roll back", async () => {
    const failure = new Error("ledger insert failed");
    appendBookingDeduction.mockRejectedValue(failure);

    await expect(service.create("slot-id", user)).rejects.toBe(failure);
  });

  it("maps the active-slot unique constraint to a booking conflict", async () => {
    createConfirmed.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "5.22.0",
      }),
    );

    await expect(service.create("slot-id", user)).rejects.toBeInstanceOf(
      BookingConcurrentConflictError,
    );
    expect(appendBookingDeduction).not.toHaveBeenCalled();
  });

  it("retries a serializable transaction conflict", async () => {
    const serializationFailure = new Prisma.PrismaClientKnownRequestError(
      "Transaction conflict",
      {
        code: "P2034",
        clientVersion: "5.22.0",
      },
    );
    runTransaction
      .mockRejectedValueOnce(serializationFailure)
      .mockImplementationOnce(async (callback: never) =>
        (callback as (client: object) => Promise<unknown>)(transaction),
      );

    await expect(service.create("slot-id", user)).resolves.toMatchObject({
      id: "booking-id",
    });
    expect(runTransaction).toHaveBeenCalledTimes(2);
  });
});
