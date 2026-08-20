import { BadRequestException, Injectable } from "@nestjs/common";
import { InsufficientPointsError } from "./point-ledger.errors";
import { PointLedgerRepository } from "./point-ledger.repository";
import {
  AppendBookingDeductionInput,
  AppendBookingRefundInput,
  PointLedgerClient,
  PointLedgerEntry,
} from "./point-ledger.types";

@Injectable()
export class PointLedgerService {
  constructor(private readonly repository: PointLedgerRepository) {}

  getBalance(userId: string, client?: PointLedgerClient): Promise<number> {
    return this.repository.getBalance(userId, client);
  }

  async assertSufficientBalance(
    userId: string,
    required: number,
    client?: PointLedgerClient,
  ): Promise<number> {
    if (!Number.isInteger(required) || required < 0) {
      throw new BadRequestException(
        "Required points must be a non-negative integer",
      );
    }
    const balance = await this.repository.getBalance(userId, client);
    if (balance < required) {
      throw new InsufficientPointsError(balance, required);
    }
    return balance;
  }

  appendBookingDeduction(
    input: AppendBookingDeductionInput,
    client?: PointLedgerClient,
  ): Promise<PointLedgerEntry> {
    if (!Number.isInteger(input.amount) || input.amount >= 0) {
      throw new BadRequestException(
        "Booking deduction amount must be a negative integer",
      );
    }
    return this.repository.appendBookingDeduction(input, client);
  }

  appendBookingRefund(
    input: AppendBookingRefundInput,
    client?: PointLedgerClient,
  ): Promise<PointLedgerEntry> {
    if (!Number.isInteger(input.amount) || input.amount <= 0) {
      throw new BadRequestException(
        "Booking refund amount must be a positive integer",
      );
    }
    return this.repository.appendBookingRefund(input, client);
  }
}
