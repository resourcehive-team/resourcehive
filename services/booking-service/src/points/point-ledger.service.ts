import { HttpException, Injectable } from "@nestjs/common";
import {
  InsufficientPointsError,
  InvalidPointDeductionError,
  InvalidPointRefundError,
  InvalidPointRequirementError,
  PointLedgerOperationError,
} from "./point-ledger.errors";
import { PointLedgerRepository } from "./point-ledger.repository";
import {
  AppendBookingEntryInput,
  PointLedgerClient,
  PointLedgerEntry,
} from "./point-ledger.types";

@Injectable()
export class PointLedgerService {
  constructor(private readonly repository: PointLedgerRepository) {}

  async getBalance(
    userId: string,
    client?: PointLedgerClient,
  ): Promise<number> {
    try {
      return await this.repository.getBalance(userId, client);
    } catch (error) {
      this.handleError(error, "retrieve");
    }
  }

  async assertSufficientBalance(
    userId: string,
    required: number,
    client?: PointLedgerClient,
  ): Promise<number> {
    try {
      if (!Number.isInteger(required) || required < 0) {
        throw new InvalidPointRequirementError();
      }
      const balance = await this.repository.getBalance(userId, client);
      if (balance < required) {
        throw new InsufficientPointsError(balance, required);
      }
      return balance;
    } catch (error) {
      this.handleError(error, "validate");
    }
  }

  async appendBookingDeduction(
    input: AppendBookingEntryInput,
    client?: PointLedgerClient,
  ): Promise<PointLedgerEntry> {
    try {
      if (!Number.isInteger(input.amount) || input.amount >= 0) {
        throw new InvalidPointDeductionError();
      }
      return await this.repository.appendBookingDeduction(input, client);
    } catch (error) {
      this.handleError(error, "deduct");
    }
  }

  async appendBookingRefund(
    input: AppendBookingEntryInput,
    client?: PointLedgerClient,
  ): Promise<PointLedgerEntry> {
    try {
      if (!Number.isInteger(input.amount) || input.amount <= 0) {
        throw new InvalidPointRefundError();
      }
      return await this.repository.appendBookingRefund(input, client);
    } catch (error) {
      this.handleError(error, "refund");
    }
  }

  private handleError(error: unknown, operation: string): never {
    if (error instanceof HttpException) throw error;
    throw new PointLedgerOperationError(operation);
  }
}
