import { PrismaService } from "@resourcehive/database";
import { NotificationCommandService } from "./notification-command.service";
import { NotificationTemplateService } from "./notification-template.service";

describe("NotificationCommandService", () => {
  const user = {
    id: "22222222-2222-4222-8222-222222222222",
    email: "student@example.edu",
  };
  const notification = {
    id: "44444444-4444-4444-8444-444444444444",
    userId: user.id,
    type: "BOOKING_CONFIRMED",
    title: "Booking confirmed",
    message: "Your booking for Robotics Lab is confirmed.",
    data: {},
    readAt: null,
    createdAt: new Date("2026-08-31T12:00:00.000Z"),
    updatedAt: new Date("2026-08-31T12:00:00.000Z"),
  };
  const claim = jest.fn().mockResolvedValue([{ id: "processed-id" }]);
  const findUser = jest.fn().mockResolvedValue(user);
  const createNotification = jest.fn().mockResolvedValue(notification);
  const findSubscriptions = jest
    .fn()
    .mockResolvedValue([{ token: "fcm-token" }]);
  const createDeliveries = jest.fn().mockResolvedValue({ count: 1 });
  const transactionClient = {
    $queryRaw: claim,
    user: { findFirst: findUser },
    notification: { create: createNotification },
    webPushSubscription: { findMany: findSubscriptions },
    notificationDelivery: { createMany: createDeliveries },
  };
  type TransactionOperation = (
    client: typeof transactionClient,
  ) => Promise<unknown>;
  const runTransaction = jest.fn(
    async (operation: TransactionOperation): Promise<unknown> =>
      operation(transactionClient),
  );
  const prisma = {
    $transaction: runTransaction,
  } as unknown as PrismaService;
  const service = new NotificationCommandService(
    prisma,
    new NotificationTemplateService(),
  );

  beforeEach(() => jest.clearAllMocks());

  it("queues verification email without creating notification history", async () => {
    await service.process({
      kind: "notification.command",
      commandId: "11111111-1111-4111-8111-111111111111",
      idempotencyKey: "verify/user/token",
      producer: "identity-service",
      recipient: { userId: user.id, email: user.email },
      channels: ["EMAIL"],
      template: {
        key: "identity.verify-email.v1",
        version: 1,
        variables: {
          verificationUrl: "https://app.example/verify-email?token=secret",
        },
      },
      correlationId: "33333333-3333-4333-8333-333333333333",
      occurredAt: "2026-08-31T12:00:00.000Z",
    });

    expect(createNotification).not.toHaveBeenCalled();
    expect(createDeliveries).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: user.id,
          channel: "EMAIL",
          destination: user.email,
          subject: "Verify your ResourceHive email",
          body: "Verify your email by opening this link: https://app.example/verify-email?token=secret",
        }),
      ],
    });
  });

  it("creates notification history and push work for booking events", async () => {
    await service.process({
      kind: "notification.command",
      commandId: "11111111-1111-4111-8111-111111111111",
      idempotencyKey: "booking/confirmed/user",
      producer: "booking-service",
      recipient: { userId: user.id },
      channels: ["IN_APP", "PUSH"],
      template: {
        key: "booking.confirmed.v1",
        version: 1,
        variables: { resourceName: "Robotics Lab" },
      },
      correlationId: "33333333-3333-4333-8333-333333333333",
      occurredAt: "2026-08-31T12:00:00.000Z",
    });

    expect(findSubscriptions).toHaveBeenCalledWith({
      where: { userId: user.id, active: true },
      select: { token: true },
    });
    expect(createDeliveries).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          notificationId: notification.id,
          channel: "PUSH",
          destination: "fcm-token",
        }),
      ],
    });
  });
});
