import { BadRequestException } from "@nestjs/common";
import { NotificationPersistenceService } from "./notification-persistence.service";
import { NotificationRepository } from "./notification.repository";

describe("NotificationPersistenceService", () => {
  const validUserId = "c7449b85-0666-4b20-a201-7c2134699869";
  const validNotificationId = "20d71182-3906-43d6-a735-02799066f9b7";
  const createNotification = jest.fn();
  const findNotificationForUser = jest.fn();
  const repository = {
    create: createNotification,
    findByIdForUser: findNotificationForUser,
  } as unknown as NotificationRepository;
  const service = new NotificationPersistenceService(repository);

  beforeEach(() => jest.clearAllMocks());

  it("normalizes and persists valid notification text", async () => {
    createNotification.mockResolvedValue({
      id: "notification-id",
      userId: "user-id",
      type: "BOOKING_CREATED",
      title: "Booking confirmed",
      message: "Your booking was confirmed.",
      readAt: null,
      createdAt: new Date(),
    });

    await service.create({
      userId: ` ${validUserId} `,
      type: " BOOKING_CREATED ",
      title: " Booking confirmed ",
      message: " Your booking was confirmed. ",
    });

    expect(createNotification).toHaveBeenCalledWith({
      userId: validUserId,
      type: "BOOKING_CREATED",
      title: "Booking confirmed",
      message: "Your booking was confirmed.",
    });
  });

  it.each([
    ["userId", { userId: " " }],
    ["type", { type: " " }],
    ["title", { title: " " }],
    ["message", { message: " " }],
  ])("rejects a blank %s", async (_field, override) => {
    await expect(
      service.create({
        userId: validUserId,
        type: "BOOKING_CREATED",
        title: "Booking confirmed",
        message: "Your booking was confirmed.",
        ...override,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(createNotification).not.toHaveBeenCalled();
  });

  it("rejects notification fields beyond their defined limits", async () => {
    await expect(
      service.create({
        userId: validUserId,
        type: "X".repeat(101),
        title: "Booking confirmed",
        message: "Your booking was confirmed.",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects a recipient identifier that is not a UUID", async () => {
    await expect(
      service.create({
        userId: "not-a-uuid",
        type: "BOOKING_CREATED",
        title: "Booking confirmed",
        message: "Your booking was confirmed.",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("delegates recipient-scoped retrieval", async () => {
    findNotificationForUser.mockResolvedValue(null);

    await service.findByIdForUser(validNotificationId, validUserId);

    expect(findNotificationForUser).toHaveBeenCalledWith({
      notificationId: validNotificationId,
      userId: validUserId,
    });
  });
});
