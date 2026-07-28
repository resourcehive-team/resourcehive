export class InsufficientPointsError extends Error {
  constructor(
    readonly balance: number,
    readonly required: number,
  ) {
    super("The user has insufficient points");
  }
}
