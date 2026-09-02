import { randomUUID } from "node:crypto";
import { HttpException } from "@nestjs/common";
import { PrismaService } from "@resourcehive/database";
import { NotificationClientService } from "@resourcehive/notification-client";
import { BookingAuthorizationService } from "../../src/authorization/booking-authorization.service";
import { BookingRepository } from "../../src/bookings/booking.repository";
import { BookingService } from "../../src/bookings/booking.service";
import { PointLedgerRepository } from "../../src/points/point-ledger.repository";
import { PointLedgerService } from "../../src/points/point-ledger.service";
import { SlotRepository } from "../../src/slots/slot.repository";

describe("Concurrent booking creation", () => {
  const prisma = new PrismaService();
  const authorization = new BookingAuthorizationService(prisma);
  const slots = new SlotRepository(prisma);
  const points = new PointLedgerService(new PointLedgerRepository(prisma));
  const service = new BookingService(
    prisma,
    authorization,
    slots,
    points,
    new BookingRepository(),
    {
      send: jest.fn().mockResolvedValue({}),
      publishBookingEvent: jest.fn().mockResolvedValue({}),
    } as unknown as NotificationClientService,
  );

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    await prisma.$connect();
  });

  it("allows exactly one of two concurrent requests to book a slot", async () => {
    const userId = randomUUID();
    const organizationId = randomUUID();
    const resourceId = randomUUID();
    const slotId = randomUUID();

    await prisma.user.create({
      data: {
        id: userId,
        email: `concurrent-booking-${userId}@example.edu`,
        passwordHash: "integration-test-only",
        firstName: "Concurrent",
        lastName: "Booking",
      },
    });
    await prisma.organization.create({
      data: {
        id: organizationId,
        name: "Concurrent booking tenant",
        type: "ROOT",
        rootOrganizationId: organizationId,
        createdBy: userId,
      },
    });
    await prisma.organizationMembership.create({
      data: {
        userId,
        organizationId,
        role: "MEMBER",
        status: "APPROVED",
        approvedBy: userId,
      },
    });
    await prisma.resource.create({
      data: {
        id: resourceId,
        name: "Concurrent booking room",
        ownerOrganizationId: organizationId,
        rootOrganizationId: organizationId,
        createdByUserId: userId,
        pointCost: 0,
      },
    });
    await prisma.resourceSlot.create({
      data: {
        id: slotId,
        resourceId,
        startsAt: new Date("2035-09-01T10:00:00.000Z"),
        endsAt: new Date("2035-09-01T11:00:00.000Z"),
      },
    });

    try {
      const user = {
        userId,
        email: `concurrent-booking-${userId}@example.edu`,
        organizationId,
        role: "member",
      };
      const attempts = await Promise.allSettled([
        service.createBooking(slotId, user),
        service.createBooking(slotId, user),
      ]);
      const successful = attempts.filter(
        (attempt) => attempt.status === "fulfilled",
      );
      const rejected = attempts.filter(
        (attempt) => attempt.status === "rejected",
      );

      expect(successful).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      const rejection: unknown = rejected[0].reason;
      expect(rejection).toBeInstanceOf(HttpException);
      if (!(rejection instanceof HttpException)) {
        throw new Error(
          "Expected the competing request to return an HTTP error",
        );
      }
      expect(rejection.getStatus()).toBe(409);
      await expect(
        prisma.booking.count({
          where: {
            resourceSlotId: slotId,
            status: { in: ["CONFIRMED", "COMPLETED"] },
          },
        }),
      ).resolves.toBe(1);
      await expect(
        prisma.pointTransaction.count({
          where: { booking: { resourceSlotId: slotId } },
        }),
      ).resolves.toBe(0);
    } finally {
      await prisma.booking.deleteMany({ where: { resourceSlotId: slotId } });
      await prisma.resourceSlot.delete({ where: { id: slotId } });
      await prisma.resource.delete({ where: { id: resourceId } });
      await prisma.organizationMembership.deleteMany({
        where: { userId, organizationId },
      });
      await prisma.organization.delete({ where: { id: organizationId } });
      await prisma.user.delete({ where: { id: userId } });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
