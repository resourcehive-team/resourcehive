import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";

export class BookingSlotNotFoundError extends NotFoundException {
  constructor() {
    super("The requested slot was not found");
  }
}

export class BookingNotFoundError extends NotFoundException {
  constructor() {
    super("Booking not found");
  }
}

export class BookingResourceInactiveError extends ConflictException {
  constructor() {
    super("The resource is not active");
  }
}

export class BookingResourceAccessDeniedError extends ForbiddenException {
  constructor() {
    super("The user cannot access this resource");
  }
}

export class BookingAdministratorRequiredError extends ForbiddenException {
  constructor() {
    super("Administrator access to the resource's organization is required");
  }
}

export class BookingAdministratorMembershipRequiredError extends ForbiddenException {
  constructor() {
    super("Approved administrator membership is required");
  }
}

export class BookingSlotStartedError extends BadRequestException {
  constructor() {
    super("The slot has already started");
  }
}

export class BookingSlotUnavailableError extends ConflictException {
  constructor() {
    super("The slot already has an active booking");
  }
}

export class BookingPointCostInvalidError extends ConflictException {
  constructor() {
    super("The resource point cost is invalid");
  }
}

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

export class BookingCannotBeCancelledError extends ConflictException {
  constructor() {
    super("Only a confirmed booking can be cancelled");
  }
}

export class BookingCancellationStartedError extends ConflictException {
  constructor() {
    super("A booking cannot be cancelled after its slot starts");
  }
}

export class BookingCancellationInputError extends BadRequestException {
  constructor() {
    super("makeSlotAvailable is required for an administrator cancellation");
  }
}

export class BookingCancellationConflictError extends ConflictException {
  constructor() {
    super("The booking is no longer confirmed");
  }
}

export class BookingCannotBeCompletedError extends ConflictException {
  constructor() {
    super("Only a confirmed booking can be marked as completed");
  }
}

export class BookingOperationError extends InternalServerErrorException {
  constructor(operation: string) {
    super(`Unable to ${operation} booking`);
  }
}
