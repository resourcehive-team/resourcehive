import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@resourcehive/database";
import { NotificationCommandService } from "../events/notification-command.service";
import { DevelopmentPushService } from "./development-push.service";

describe("DevelopmentPushService", () => {
  const countDevices = jest.fn();
  const processCommand = jest.fn();
  const prisma = {
    userDevice: { count: countDevices },
  } as unknown as PrismaService;
  const commands = {
    process: processCommand,
  } as unknown as NotificationCommandService;
  const service = new DevelopmentPushService(prisma, commands);
  const userId = "22222222-2222-4222-8222-222222222222";

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

    await expect(service.queue(userId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(countDevices).not.toHaveBeenCalled();
  });

  it("requires the real FCM provider", async () => {
    process.env.FCM_ENABLED = "false";

    await expect(service.queue(userId)).rejects.toThrow(
      "FCM_ENABLED must be true",
    );
  });

  it("requires an active registered device", async () => {
    countDevices.mockResolvedValue(0);

    await expect(service.queue(userId)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(processCommand).not.toHaveBeenCalled();
  });

  it("queues in-app and push delivery for every active device", async () => {
    countDevices.mockResolvedValue(2);
    processCommand.mockResolvedValue({
      duplicate: false,
      notificationId: "44444444-4444-4444-8444-444444444444",
    });

    await expect(service.queue(userId)).resolves.toEqual({
      notificationId: "44444444-4444-4444-8444-444444444444",
      pushDeliveriesQueued: 2,
    });
    expect(processCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        producer: "notification-service",
        recipient: { userId },
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
