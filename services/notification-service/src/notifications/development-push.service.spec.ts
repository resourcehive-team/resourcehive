import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@resourcehive/database";
import { AuthenticatedUser } from "@resourcehive/service-auth";
import { NotificationCommandService } from "../events/notification-command.service";
import { DevelopmentPushService } from "./development-push.service";

describe("DevelopmentPushService", () => {
  const countSubscriptions = jest.fn();
  const processCommand = jest.fn();
  const prisma = {
    webPushSubscription: { count: countSubscriptions },
  } as unknown as PrismaService;
  const commands = {
    process: processCommand,
  } as unknown as NotificationCommandService;
  const service = new DevelopmentPushService(prisma, commands);
  const userId = "22222222-2222-4222-8222-222222222222";
  const user = {
    userId,
    email: "user@example.edu",
    organizationId: "33333333-3333-4333-8333-333333333333",
    rootOrganizationId: "44444444-4444-4444-8444-444444444444",
    role: "member",
  } as AuthenticatedUser;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = "test";
    process.env.FCM_ENABLED = "true";
  });

  afterAll(() => {
    delete process.env.FCM_ENABLED;
  });

  it("is unavailable in production", async () => {
    process.env.NODE_ENV = "production";

    await expect(service.queue(user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(countSubscriptions).not.toHaveBeenCalled();
  });

  it("requires the real FCM provider", async () => {
    process.env.FCM_ENABLED = "false";

    await expect(service.queue(user)).rejects.toThrow(
      "FCM_ENABLED must be true",
    );
  });

  it("requires an active browser subscription", async () => {
    countSubscriptions.mockResolvedValue(0);

    await expect(service.queue(user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(processCommand).not.toHaveBeenCalled();
  });

  it("queues in-app and push delivery for every active browser", async () => {
    countSubscriptions.mockResolvedValue(2);
    processCommand.mockResolvedValue({
      duplicate: false,
      notificationId: "44444444-4444-4444-8444-444444444444",
    });

    await expect(service.queue(user)).resolves.toEqual({
      notificationId: "44444444-4444-4444-8444-444444444444",
      pushDeliveriesQueued: 2,
    });
    expect(processCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        producer: "notification-service",
        recipient: { userId },
        rootOrganizationId: user.rootOrganizationId,
        channels: ["IN_APP", "PUSH"],
        template: {
          key: "development.test-push.v1",
          version: 1,
          variables: {},
        },
      }),
    );
  });
});
