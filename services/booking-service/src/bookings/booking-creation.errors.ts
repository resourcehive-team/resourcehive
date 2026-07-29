import { ConflictException } from "@nestjs/common";

export class BookingConcurrentConflictError extends ConflictException {
  constructor() {
    super("The slot was booked by another request");
  }
}

export class BookingTransactionConflictError extends ConflictException {
  constructor() {
    super("The booking could not be completed because of a concurrent update");
  }
}
