import { PrismaService } from "@resourcehive/database";
import { PointLedgerRepository } from "./point-ledger.repository";
import { PointLedgerClient } from "./point-ledger.types";

describe("PointLedgerRepository", () => {
  const pointTransaction = {
    aggregate: jest.fn(),
    create: jest.fn(),
  };
  const repository = new PointLedgerRepository({
    pointTransaction,
  } as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it("sums the append-only ledger for one user", async () => {
    pointTransaction.aggregate.mockResolvedValue({ _sum: { amount: 75 } });

    await expect(repository.getBalance("user-id")).resolves.toBe(75);
    expect(pointTransaction.aggregate).toHaveBeenCalledWith({
      where: { userId: "user-id" },
      _sum: { amount: true },
    });
  });

  it("returns zero for an empty ledger", async () => {
    pointTransaction.aggregate.mockResolvedValue({ _sum: { amount: null } });
    await expect(repository.getBalance("user-id")).resolves.toBe(0);
  });

  it("uses the supplied transaction client for a booking deduction", async () => {
    const transaction = {
      pointTransaction: { aggregate: jest.fn(), create: jest.fn() },
    };
    transaction.pointTransaction.create.mockResolvedValue({ id: "entry-id" });

    await repository.appendBookingDeduction(
      { userId: "user-id", bookingId: "booking-id", amount: -25 },
      transaction as unknown as PointLedgerClient,
    );

    expect(transaction.pointTransaction.create).toHaveBeenCalledWith({
      data: {
        userId: "user-id",
        bookingId: "booking-id",
        amount: -25,
        transactionType: "BOOKING",
        description: undefined,
      },
    });
    expect(pointTransaction.create).not.toHaveBeenCalled();
  });
});
