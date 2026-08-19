import { randomUUID } from "node:crypto";
import { PrismaService } from "@resourcehive/database";
import { PointLedgerRepository } from "../../src/points/point-ledger.repository";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = testDatabaseUrl ? describe : describe.skip;

describeWithDatabase("PointLedgerRepository integration", () => {
  const prisma = new PrismaService();
  const repository = new PointLedgerRepository(prisma);
  const userId = randomUUID();
  const otherUserId = randomUUID();
  const organizationId = randomUUID();
  const rollbackFixture = new Error(
    "rollback point ledger integration fixture",
  );

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    await prisma.$connect();
  });

  it("calculates balance from only the requested user's append-only entries", async () => {
    try {
      await prisma.$transaction(
        async (transaction) => {
          await transaction.user.createMany({
            data: [
              {
                id: userId,
                email: `point-user-${userId}@example.edu`,
                passwordHash: "integration-test-only",
                firstName: "Point",
                lastName: "User",
              },
              {
                id: otherUserId,
                email: `point-other-${otherUserId}@example.edu`,
                passwordHash: "integration-test-only",
                firstName: "Other",
                lastName: "User",
              },
            ],
          });
          await transaction.organization.create({
            data: {
              id: organizationId,
              name: "Point ledger integration tenant",
              type: "ROOT",
              rootOrganizationId: organizationId,
              createdBy: userId,
            },
          });
          await transaction.pointTransaction.createMany({
            data: [
              {
                userId,
                amount: 100,
                transactionType: "JOIN_BONUS",
                sourceOrganizationId: organizationId,
              },
              {
                userId: otherUserId,
                amount: 500,
                transactionType: "JOIN_BONUS",
                sourceOrganizationId: organizationId,
              },
            ],
          });

          await expect(
            repository.getBalance(userId, transaction),
          ).resolves.toBe(100);
          await expect(
            repository.getBalance(otherUserId, transaction),
          ).resolves.toBe(500);

          throw rollbackFixture;
        },
        { maxWait: 10000, timeout: 30000 },
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
