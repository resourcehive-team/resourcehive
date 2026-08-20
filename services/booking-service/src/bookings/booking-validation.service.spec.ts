import { BookingAuthorizationService } from "../authorization/booking-authorization.service";
import { InsufficientPointsError } from "../points/point-ledger.errors";
import { PointLedgerService } from "../points/point-ledger.service";
import { SlotRepository } from "../slots/slot.repository";
import {
  BookingResourceAccessDeniedError,
  BookingResourceInactiveError,
  BookingSlotStartedError,
  BookingSlotUnavailableError,
} from "./booking-validation.errors";
import { BookingValidationService } from "./booking-validation.service";

describe("BookingValidationService", () => {
  const authorization = {
    resolve: jest.fn(),
  } as unknown as BookingAuthorizationService;
  const slots = {
    findById: jest.fn(),
    canAccessResource: jest.fn(),
  } as unknown as SlotRepository;
  const points = {
    assertSufficientBalance: jest.fn(),
  } as unknown as PointLedgerService;
  const service = new BookingValidationService(authorization, slots, points);
  const user = {
    userId: "user-id",
    email: "user@example.edu",
    organizationId: "organization-id",
    role: "member",
  };
  const context = {
    userId: "user-id",
    organizationId: "organization-id",
    rootOrganizationId: "root-id",
    role: "MEMBER",
  };
  const slot = {
    id: "slot-id",
    resourceId: "resource-id",
    startsAt: new Date("2030-08-01T10:00:00.000Z"),
    endsAt: new Date("2030-08-01T11:00:00.000Z"),
    status: "PUBLISHED",
    withdrawnAt: null,
    createdAt: new Date("2026-08-01T09:00:00.000Z"),
    resource: {
      id: "resource-id",
      name: "Room",
      status: "ACTIVE",
      rootOrganizationId: "root-id",
      ownerOrganizationId: "organization-id",
      pointCost: 25,
    },
    bookings: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(authorization, "resolve").mockResolvedValue(context);
    jest.spyOn(slots, "findById").mockResolvedValue(slot);
    jest.spyOn(slots, "canAccessResource").mockResolvedValue(true);
    jest.spyOn(points, "assertSufficientBalance").mockResolvedValue(100);
  });

  it("returns only server-derived booking values for a valid request", async () => {
    const assertBalance = jest.spyOn(points, "assertSufficientBalance");

    await expect(service.validate("slot-id", user)).resolves.toEqual({
      userId: "user-id",
      rootOrganizationId: "root-id",
      resourceId: "resource-id",
      resourceSlotId: "slot-id",
      pointCost: 25,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
    });
    expect(assertBalance).toHaveBeenCalledWith("user-id", 25);
  });

  it("rejects an inactive resource", async () => {
    jest.spyOn(slots, "findById").mockResolvedValue({
      ...slot,
      resource: { ...slot.resource, status: "INACTIVE" },
    });

    await expect(service.validate("slot-id", user)).rejects.toBeInstanceOf(
      BookingResourceInactiveError,
    );
  });

  it("rejects a resource the user cannot access", async () => {
    jest.spyOn(slots, "canAccessResource").mockResolvedValue(false);
    await expect(service.validate("slot-id", user)).rejects.toBeInstanceOf(
      BookingResourceAccessDeniedError,
    );
  });

  it("rejects a slot that has already started", async () => {
    jest.spyOn(slots, "findById").mockResolvedValue({
      ...slot,
      startsAt: new Date("2020-08-01T10:00:00.000Z"),
      endsAt: new Date("2020-08-01T11:00:00.000Z"),
    });
    await expect(service.validate("slot-id", user)).rejects.toBeInstanceOf(
      BookingSlotStartedError,
    );
  });

  it("rejects a slot with an active booking", async () => {
    jest.spyOn(slots, "findById").mockResolvedValue({
      ...slot,
      bookings: [{ id: "booking-id" }],
    });
    await expect(service.validate("slot-id", user)).rejects.toBeInstanceOf(
      BookingSlotUnavailableError,
    );
  });

  it("propagates insufficient points without writing to the ledger", async () => {
    jest
      .spyOn(points, "assertSufficientBalance")
      .mockRejectedValue(new InsufficientPointsError(20, 25));
    await expect(service.validate("slot-id", user)).rejects.toEqual(
      new InsufficientPointsError(20, 25),
    );
  });

  it("accepts an accessible zero-cost resource", async () => {
    const assertBalance = jest.spyOn(points, "assertSufficientBalance");
    jest.spyOn(slots, "findById").mockResolvedValue({
      ...slot,
      resource: { ...slot.resource, pointCost: 0 },
    });

    await expect(service.validate("slot-id", user)).resolves.toMatchObject({
      pointCost: 0,
    });
    expect(assertBalance).toHaveBeenCalledWith("user-id", 0);
  });
});
