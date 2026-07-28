export class SlotResourceNotFoundError extends Error {
  constructor() {
    super("Resource was not found in the requested tenant");
    this.name = "SlotResourceNotFoundError";
  }
}

export class SlotNotFoundError extends Error {
  constructor() {
    super("Slot not found");
  }
}

export class SlotAccessDeniedError extends Error {
  constructor() {
    super("The authenticated user cannot access this resource");
  }
}
