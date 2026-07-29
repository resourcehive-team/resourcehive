import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";

export class BookingSlotNotFoundError extends NotFoundException {
  constructor() {
    super("The requested slot was not found");
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
