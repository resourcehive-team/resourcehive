import { randomUUID } from "node:crypto";
import { PrismaService } from "@resourcehive/database";
import { NotificationRepository } from "../src/notifications/notification.repository";

describe("Concurrent notification reads", () => {
  const prisma = new PrismaService();
  const repository = new NotificationRepository(prisma);

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    await prisma.$connect();
  });

  it("keeps one notification record when concurrent requests mark it read", async () => {
    const userId = randomUUID();
    const notificationId = randomUUID();
    await prisma.user.create({
      data: {
        id: userId,
        email: `concurrent-notification-${userId}@example.edu`,
        passwordHash: "integration-test-only",
        firstName: "Concurrent",
        lastName: "Notification",
      },
    });
    await prisma.notification.create({
      data: {
        id: notificationId,
        userId,
        type: "BOOKING_CREATED",
        title: "Booking confirmed",
        message: "Concurrent read test",
      },
    });

    try {
      const results = await Promise.all(
        Array.from({ length: 8 }, () =>
          repository.markReadForUser({ notificationId, userId }),
        ),
      );

      expect(results).toHaveLength(8);
      expect(
        results.every((notification) => notification?.readAt instanceof Date),
      ).toBe(true);
      await expect(
        prisma.notification.count({ where: { id: notificationId, userId } }),
      ).resolves.toBe(1);
      const stored = await prisma.notification.findUnique({
        where: { id: notificationId },
      });
      expect(stored?.id).toBe(notificationId);
      expect(stored?.userId).toBe(userId);
      expect(stored?.readAt).toBeInstanceOf(Date);
    } finally {
      await prisma.notification.delete({ where: { id: notificationId } });
      await prisma.user.delete({ where: { id: userId } });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
