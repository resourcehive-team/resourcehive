import { randomUUID } from "node:crypto";
import { PrismaService } from "@resourcehive/database";
import { PointLedgerRepository } from "../src/points/point-ledger.repository";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = testDatabaseUrl ? describe : describe.skip;

describeWithDatabase("PointLedgerRepository integration", () => {
  const prisma = new PrismaService();
  const repository = new PointLedgerRepository(prisma);
  const userId = randomUUID();
  const otherUserId = randomUUID();

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    await prisma.$connect();
    await prisma.user.createMany({
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
    await prisma.pointTransaction.createMany({
      data: [
        {
          userId,
          amount: 100,
          transactionType: "TEST_CREDIT",
        },
        {
          userId,
          amount: -25,
          transactionType: "TEST_DEDUCTION",
        },
        {
          userId: otherUserId,
          amount: 500,
          transactionType: "TEST_CREDIT",
        },
      ],
    });
  });

  it("calculates balance from only the requested user's append-only entries", async () => {
    await expect(repository.getBalance(userId)).resolves.toBe(75);
    await expect(repository.getBalance(otherUserId)).resolves.toBe(500);
  });

  afterAll(async () => {
    await prisma.pointTransaction.deleteMany({
      where: { userId: { in: [userId, otherUserId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userId, otherUserId] } },
    });
    await prisma.$disconnect();
  });
});
