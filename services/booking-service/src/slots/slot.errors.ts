export class SlotResourceNotFoundError extends Error {
  constructor() {
    super("Resource was not found in the requested tenant");
    this.name = "SlotResourceNotFoundError";
  }
}
