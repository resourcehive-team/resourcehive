import { randomUUID } from "node:crypto";
import { PrismaService } from "@resourcehive/database";
import { NotificationRepository } from "../src/notifications/notification.repository";

describe("NotificationRepository integration", () => {
  const prisma = new PrismaService();
  const repository = new NotificationRepository(prisma);
  const firstUserId = randomUUID();
  const secondUserId = randomUUID();
  const rootOrganizationId = randomUUID();

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    await prisma.$connect();
    await prisma.user.createMany({
      data: [
        {
          id: firstUserId,
          email: `notification-first-${firstUserId}@example.edu`,
          passwordHash: "integration-test-only",
          firstName: "First",
          lastName: "Recipient",
        },
        {
          id: secondUserId,
          email: `notification-second-${secondUserId}@example.edu`,
          passwordHash: "integration-test-only",
          firstName: "Second",
          lastName: "Recipient",
        },
      ],
    });
    await prisma.organization.create({
      data: {
        id: rootOrganizationId,
        name: "Notification integration university",
        type: "UNIVERSITY",
        rootOrganizationId,
        createdBy: firstUserId,
      },
    });
  });

  it("persists notifications and isolates reads by recipient", async () => {
    const created = await repository.create({
      userId: firstUserId,
      rootOrganizationId,
      type: "BOOKING_CREATED",
      title: "New booking",
      message: "A student created a booking.",
    });
    await repository.create({
      userId: secondUserId,
      rootOrganizationId,
      type: "BOOKING_CREATED",
      title: "Another booking",
      message: "This belongs to another recipient.",
    });

    await expect(
      repository.findByIdForUser({
        notificationId: created.id,
        userId: secondUserId,
        rootOrganizationId,
      }),
    ).resolves.toBeNull();

    await expect(
      repository.findManyForUser({
        userId: firstUserId,
        rootOrganizationId,
        unreadOnly: true,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: created.id,
        userId: firstUserId,
        readAt: null,
      }),
    ]);

    const markedRead = await repository.markReadForUser({
      notificationId: created.id,
      userId: firstUserId,
      rootOrganizationId,
    });
    expect(markedRead?.id).toBe(created.id);
    expect(markedRead?.readAt).toBeInstanceOf(Date);

    await expect(
      repository.findManyForUser({
        userId: firstUserId,
        rootOrganizationId,
        unreadOnly: true,
      }),
    ).resolves.toEqual([]);
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({
      where: { userId: { in: [firstUserId, secondUserId] } },
    });
    await prisma.organization.delete({ where: { id: rootOrganizationId } });
    await prisma.user.deleteMany({
      where: { id: { in: [firstUserId, secondUserId] } },
    });
    await prisma.$disconnect();
  });
});
