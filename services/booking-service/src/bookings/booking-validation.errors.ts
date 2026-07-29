export class BookingSlotNotFoundError extends Error {
  constructor() {
    super("The requested slot was not found");
  }
}

export class BookingResourceInactiveError extends Error {
  constructor() {
    super("The resource is not active");
  }
}

export class BookingResourceAccessDeniedError extends Error {
  constructor() {
    super("The user cannot access this resource");
  }
}

export class BookingSlotStartedError extends Error {
  constructor() {
    super("The slot has already started");
  }
}

export class BookingSlotUnavailableError extends Error {
  constructor() {
    super("The slot already has an active booking");
  }
}

export class BookingPointCostInvalidError extends Error {
  constructor() {
    super("The resource point cost is invalid");
  }
}
