import { PrismaService } from "@resourcehive/database";
import { NotificationRepository } from "./notification.repository";

describe("NotificationRepository", () => {
  const notification = {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };
  const user = { findFirst: jest.fn() };
  const webPushSubscription = {
    upsert: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
  };
  const repository = new NotificationRepository({
    notification,
    user,
    webPushSubscription,
  } as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it("persists a new unread notification for one user", async () => {
    notification.create.mockResolvedValue({ id: "notification-id" });

    await repository.create({
      userId: "user-id",
      type: "BOOKING_CREATED",
      title: "Booking confirmed",
      message: "Your booking was confirmed.",
    });

    expect(notification.create).toHaveBeenCalledWith({
      data: {
        userId: "user-id",
        type: "BOOKING_CREATED",
        title: "Booking confirmed",
        message: "Your booking was confirmed.",
      },
    });
  });

  it("lists unread notifications with recipient scope and stable ordering", async () => {
    notification.findMany.mockResolvedValue([]);
    await repository.findManyForUser({
      userId: "recipient-id",
      unreadOnly: true,
      skip: 5,
      take: 10,
    });
    expect(notification.findMany).toHaveBeenCalledWith({
      where: { userId: "recipient-id", readAt: null },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: 5,
      take: 10,
    });
  });

  it("returns an already-read notification without rewriting it", async () => {
    const record = { id: "notification-id", readAt: new Date() };
    notification.findFirst.mockResolvedValue(record);
    await expect(
      repository.markReadForUser({
        notificationId: "notification-id",
        userId: "recipient-id",
      }),
    ).resolves.toBe(record);
    expect(notification.update).not.toHaveBeenCalled();
  });

  it("scopes retrieval to the recipient", async () => {
    notification.findFirst.mockResolvedValue(null);

    await repository.findByIdForUser({
      notificationId: "notification-id",
      userId: "recipient-id",
    });

    expect(notification.findFirst).toHaveBeenCalledWith({
      where: {
        id: "notification-id",
        userId: "recipient-id",
      },
    });
  });

  it("registers one browser token for the authenticated user", async () => {
    webPushSubscription.upsert.mockResolvedValue({ id: "subscription-id" });

    await repository.registerWebPush("user-id", "fcm-token");

    expect(webPushSubscription.upsert).toHaveBeenCalledWith({
      where: { token: "fcm-token" },
      create: { userId: "user-id", token: "fcm-token" },
      update: { userId: "user-id", active: true },
    });
  });
});
