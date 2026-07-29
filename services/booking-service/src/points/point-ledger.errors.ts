import { ConflictException } from "@nestjs/common";

export class InsufficientPointsError extends ConflictException {
  constructor(
    readonly balance: number,
    readonly required: number,
  ) {
    super("The user has insufficient points");
  }
}
