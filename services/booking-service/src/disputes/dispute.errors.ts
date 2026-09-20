import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";

export class DisputeBookingNotFoundError extends NotFoundException {
  constructor() {
    super("The booking was not found");
  }
}

export class DisputeNotFoundError extends NotFoundException {
  constructor() {
    super("Dispute not found");
  }
}

export class DisputeBookingNotEligibleError extends ConflictException {
  constructor() {
    super("Only a completed booking of your own can be disputed");
  }
}

export class DisputeAlreadyExistsError extends ConflictException {
  constructor() {
    super("This booking already has a dispute");
  }
}

export class DisputeForbiddenError extends ForbiddenException {
  constructor() {
    super("You cannot access this dispute");
  }
}

export class DisputeAdministratorRequiredError extends ForbiddenException {
  constructor() {
    super("Administrator access to the resource's organization is required");
  }
}

export class DisputeInvalidTransitionError extends BadRequestException {
  constructor() {
    super("The dispute cannot move to that status from its current status");
  }
}

export class DisputeResolutionNotesRequiredError extends BadRequestException {
  constructor() {
    super("Resolution notes are required to resolve or reject a dispute");
  }
}

export class DisputeResourceActionInvalidError extends ConflictException {
  constructor() {
    super("The resource is not linked to this dispute");
  }
}

export class DisputeOperationError extends InternalServerErrorException {
  constructor(operation: string) {
    super(`Unable to ${operation} dispute`);
  }
}
