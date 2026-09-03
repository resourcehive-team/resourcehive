import { randomUUID } from "node:crypto";
import { Prisma, PrismaService } from "@resourcehive/database";
import { BookingAuthorizationService } from "../../src/authorization/booking-authorization.service";
import { BookingRepository } from "../../src/bookings/booking.repository";
import { BookingService } from "../../src/bookings/booking.service";
import { BookingNotificationService } from "../../src/notifications/booking-notification.service";
import { PointLedgerRepository } from "../../src/points/point-ledger.repository";
import { PointLedgerService } from "../../src/points/point-ledger.service";
import { SlotRepository } from "../../src/slots/slot.repository";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = testDatabaseUrl ? describe : describe.skip;

describeWithDatabase("Atomic booking creation integration", () => {
  const prisma = new PrismaService();
  const authorization = new BookingAuthorizationService(prisma);
  const slots = new SlotRepository(prisma);
  const points = new PointLedgerService(new PointLedgerRepository(prisma));
  const rollbackFixture = new Error("rollback atomic booking fixture");

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    await prisma.$connect();
  });

  it("creates the booking and its point deduction in the same transaction", async () => {
    const userId = randomUUID();
    const organizationId = randomUUID();
    const resourceId = randomUUID();
    const slotId = randomUUID();

    try {
      await prisma.$transaction(
        async (transaction) => {
          await transaction.user.create({
            data: {
              id: userId,
              email: `atomic-booking-${userId}@example.edu`,
              passwordHash: "integration-test-only",
              firstName: "Atomic",
              lastName: "Booking",
            },
          });
          await transaction.organization.create({
            data: {
              id: organizationId,
              name: "Atomic booking tenant",
              type: "ROOT",
              rootOrganizationId: organizationId,
              createdBy: userId,
            },
          });
          await transaction.organizationMembership.create({
            data: {
              userId,
              organizationId,
              role: "MEMBER",
              status: "APPROVED",
              approvedBy: userId,
            },
          });
          await transaction.resource.create({
            data: {
              id: resourceId,
              name: "Atomic booking projector",
              ownerOrganizationId: organizationId,
              rootOrganizationId: organizationId,
              createdByUserId: userId,
              pointCost: 25,
            },
          });
          await transaction.resourceSlot.create({
            data: {
              id: slotId,
              resourceId,
              startsAt: new Date("2035-08-01T10:00:00.000Z"),
              endsAt: new Date("2035-08-01T11:00:00.000Z"),
            },
          });
          await transaction.pointTransaction.create({
            data: {
              userId,
              amount: 100,
              transactionType: "JOIN_BONUS",
              sourceOrganizationId: organizationId,
            },
          });

          const transactionalPrisma = {
            $transaction: <T>(
              callback: (client: Prisma.TransactionClient) => Promise<T>,
            ): Promise<T> => callback(transaction),
          } as unknown as PrismaService;
          const service = new BookingService(
            transactionalPrisma,
            authorization,
            slots,
            points,
            new BookingRepository(),
            {
              bookingConfirmed: jest.fn().mockResolvedValue(undefined),
            } as unknown as BookingNotificationService,
          );
          const result = await service.createBooking(slotId, {
            userId,
            email: `atomic-booking-${userId}@example.edu`,
            organizationId,
            role: "member",
          });

          await expect(
            transaction.booking.count({
              where: { id: result.id, status: "CONFIRMED" },
            }),
          ).resolves.toBe(1);
          await expect(
            transaction.pointTransaction.aggregate({
              where: { userId },
              _sum: { amount: true },
            }),
          ).resolves.toEqual({ _sum: { amount: 75 } });
          await expect(
            transaction.pointTransaction.count({
              where: {
                userId,
                bookingId: result.id,
                transactionType: "BOOKING",
                amount: -25,
              },
            }),
          ).resolves.toBe(1);

          throw rollbackFixture;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 10000,
          timeout: 30000,
        },
      );
    } catch (error) {
      if (error !== rollbackFixture) {
        throw error;
      }
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
