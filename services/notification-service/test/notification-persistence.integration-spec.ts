import { randomUUID } from "node:crypto";
import { PrismaService } from "@resourcehive/database";
import { NotificationPersistenceService } from "../src/notifications/notification-persistence.service";
import { NotificationRepository } from "../src/notifications/notification.repository";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = testDatabaseUrl ? describe : describe.skip;

describeWithDatabase("Notification persistence integration", () => {
  const prisma = new PrismaService();
  const repository = new NotificationRepository(prisma);
  const service = new NotificationPersistenceService(repository);
  const recipientId = randomUUID();
  const otherUserId = randomUUID();

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    await prisma.$connect();
    await prisma.user.createMany({
      data: [
        {
          id: recipientId,
          email: `notification-recipient-${recipientId}@example.edu`,
          passwordHash: "integration-test-only",
          firstName: "Notification",
          lastName: "Recipient",
        },
        {
          id: otherUserId,
          email: `notification-other-${otherUserId}@example.edu`,
          passwordHash: "integration-test-only",
          firstName: "Other",
          lastName: "User",
        },
      ],
    });
  });

  it("persists an unread notification and isolates it by recipient", async () => {
    const notification = await service.create({
      userId: recipientId,
      type: "BOOKING_CREATED",
      title: "Booking confirmed",
      message: "Your integration-test booking was confirmed.",
    });

    expect(notification.readAt).toBeNull();

    await expect(
      service.findByIdForUser(notification.id, recipientId),
    ).resolves.toMatchObject({
      id: notification.id,
      userId: recipientId,
      type: "BOOKING_CREATED",
    });

    await expect(
      service.findByIdForUser(notification.id, otherUserId),
    ).resolves.toBeNull();
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({
      where: { userId: { in: [recipientId, otherUserId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [recipientId, otherUserId] } },
    });
    await prisma.$disconnect();
  });
});
