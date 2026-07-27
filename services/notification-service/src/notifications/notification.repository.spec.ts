import { PrismaService } from "@resourcehive/database";
import { NotificationRepository } from "./notification.repository";

describe("NotificationRepository", () => {
  const notification = {
    create: jest.fn(),
    findFirst: jest.fn(),
  };
  const repository = new NotificationRepository({
    notification,
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
});
