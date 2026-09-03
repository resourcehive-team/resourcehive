import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { BookingAuthorizationService } from "../authorization/booking-authorization.service";
import { BookingNotificationService } from "../notifications/booking-notification.service";
import { SlotRepository } from "./slot.repository";
import { SlotsService } from "./slots.service";

describe("SlotsService", () => {
  const repository = {
    canManageResource: jest.fn(),
    canAccessResource: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findByResource: jest.fn(),
  } as unknown as SlotRepository;
  const authorization = {
    resolve: jest.fn(),
  } as unknown as BookingAuthorizationService;
  const slotCreated = jest.fn();
  const notifications = {
    slotCreated,
  } as unknown as BookingNotificationService;
  const service = new SlotsService(repository, authorization, notifications);
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

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(authorization, "resolve").mockResolvedValue(context);
    slotCreated.mockResolvedValue(undefined);
  });

  it("rejects an invalid slot interval", async () => {
    await expect(
      service.create(
        {
          resourceId: "resource-id",
          startsAt: new Date("2026-08-01T11:00:00Z"),
          endsAt: new Date("2026-08-01T10:00:00Z"),
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("requires inherited administrator authority to create", async () => {
    jest.spyOn(repository, "canManageResource").mockResolvedValue(false);
    await expect(
      service.create(
        {
          resourceId: "resource-id",
          startsAt: new Date("2026-08-01T10:00:00Z"),
          endsAt: new Date("2026-08-01T11:00:00Z"),
        },
        user,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("notifies other administrators after creating a slot", async () => {
    const startsAt = new Date("2030-08-01T10:00:00.000Z");
    const endsAt = new Date("2030-08-01T11:00:00.000Z");
    jest.spyOn(repository, "canManageResource").mockResolvedValue(true);
    jest.spyOn(repository, "create").mockResolvedValue({
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
        pointCost: 10,
      },
      bookings: [],
    });

    await service.create({ resourceId: "resource-id", startsAt, endsAt }, user);

    expect(slotCreated).toHaveBeenCalledWith({
      slotId: "slot-id",
      actorUserId: "user-id",
      resourceName: "Room",
      startsAt,
      endsAt,
      ownerOrganizationId: "organization-id",
    });
  });

  it("hides a slot when the user lacks resource access", async () => {
    jest.spyOn(repository, "findById").mockResolvedValue({
      id: "slot-id",
      resourceId: "resource-id",
    } as never);
    jest.spyOn(repository, "canAccessResource").mockResolvedValue(false);

    await expect(service.findOne("slot-id", user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("marks a future unbooked active slot available", async () => {
    jest.spyOn(repository, "canAccessResource").mockResolvedValue(true);
    jest.spyOn(repository, "findByResource").mockResolvedValue([
      {
        id: "slot-id",
        resourceId: "resource-id",
        startsAt: new Date(Date.now() + 60_000),
        endsAt: new Date(Date.now() + 120_000),
        status: "PUBLISHED",
        withdrawnAt: null,
        createdAt: new Date(),
        resource: {
          id: "resource-id",
          name: "Room",
          status: "ACTIVE",
          rootOrganizationId: "root-id",
          ownerOrganizationId: "organization-id",
          pointCost: 10,
        },
        bookings: [],
      },
    ]);

    const result = await service.list(
      "resource-id",
      { skip: 0, take: 50 },
      user,
    );
    expect(result[0]?.available).toBe(true);
  });
});
