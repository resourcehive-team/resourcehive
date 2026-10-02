import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from "@nestjs/common";

export class InsufficientPointsError extends ConflictException {
  constructor(
    readonly balance: number,
    readonly required: number,
  ) {
    super("The user has insufficient points");
  }
}

export class InvalidPointRequirementError extends BadRequestException {
  constructor() {
    super("Required points must be a non-negative integer");
  }
}

export class InvalidPointDeductionError extends BadRequestException {
  constructor() {
    super("Booking deduction amount must be a negative integer");
  }
}

export class InvalidPointRefundError extends BadRequestException {
  constructor() {
    super("Booking refund amount must be a positive integer");
  }
}

export class PointLedgerOperationError extends InternalServerErrorException {
  constructor(operation: string) {
    super(`Unable to ${operation} points`);
  }
}
