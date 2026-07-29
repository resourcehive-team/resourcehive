import { BadRequestException } from "@nestjs/common";
import { InsufficientPointsError } from "./point-ledger.errors";
import { PointLedgerRepository } from "./point-ledger.repository";
import { PointLedgerService } from "./point-ledger.service";

describe("PointLedgerService", () => {
  const repository = {
    getBalance: jest.fn(),
    appendBookingDeduction: jest.fn(),
  } as unknown as PointLedgerRepository;
  const service = new PointLedgerService(repository);

  beforeEach(() => jest.clearAllMocks());

  it("accepts a balance equal to the required points", async () => {
    jest.spyOn(repository, "getBalance").mockResolvedValue(20);
    await expect(service.assertSufficientBalance("user-id", 20)).resolves.toBe(
      20,
    );
  });

  it("rejects an insufficient balance with balance details", async () => {
    jest.spyOn(repository, "getBalance").mockResolvedValue(19);
    await expect(
      service.assertSufficientBalance("user-id", 20),
    ).rejects.toEqual(new InsufficientPointsError(19, 20));
  });

  it("rejects non-negative booking deductions", () => {
    expect(() =>
      service.appendBookingDeduction({
        userId: "user-id",
        bookingId: "booking-id",
        amount: 0,
      }),
    ).toThrow(BadRequestException);
  });
});
