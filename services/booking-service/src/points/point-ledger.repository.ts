import { Injectable } from "@nestjs/common";
import { PrismaService } from "@resourcehive/database";
import {
  AppendBookingDeductionInput,
  PointLedgerClient,
  PointLedgerEntry,
} from "./point-ledger.types";

@Injectable()
export class PointLedgerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getBalance(
    userId: string,
    client: PointLedgerClient = this.prisma,
  ): Promise<number> {
    const result = await client.pointTransaction.aggregate({
      where: { userId },
      _sum: { amount: true },
    });
    return result._sum.amount ?? 0;
  }

  appendBookingDeduction(
    input: AppendBookingDeductionInput,
    client: PointLedgerClient = this.prisma,
  ): Promise<PointLedgerEntry> {
    return client.pointTransaction.create({
      data: {
        userId: input.userId,
        bookingId: input.bookingId,
        amount: input.amount,
        transactionType: "BOOKING_DEDUCTION",
        description: input.description,
      },
    });
  }
}
