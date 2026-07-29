export interface ValidatedBookingContext {
  userId: string;
  rootOrganizationId: string;
  resourceId: string;
  resourceSlotId: string;
  pointCost: number;
  startsAt: Date;
  endsAt: Date;
}
