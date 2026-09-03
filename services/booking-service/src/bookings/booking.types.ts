import { Prisma } from "@resourcehive/database";

export type BookingTransactionClient = Pick<
  Prisma.TransactionClient,
  | "booking"
  | "organization"
  | "organizationMembership"
  | "pointTransaction"
  | "resource"
  | "resourceSlot"
>;

export interface CreateConfirmedBookingInput {
  resourceSlotId: string;
  userId: string;
}

export interface ValidatedBookingContext {
  userId: string;
  rootOrganizationId: string;
  resourceId: string;
  resourceSlotId: string;
  pointCost: number;
  startsAt: Date;
  endsAt: Date;
}

export interface BookingRecord {
  id: string;
  resourceSlotId: string;
  userId: string;
  status: string;
  createdAt: Date;
  resourceSlot: {
    startsAt: Date;
    endsAt: Date;
    resource: {
      id: string;
      name: string;
      pointCost: number;
      ownerOrganizationId: string;
    };
  };
}

export interface OrganizationBookingRecord extends BookingRecord {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    status: string;
    emailVerifiedAt: Date | null;
    createdAt: Date;
  };
}

export interface CancelledBookingRecord extends OrganizationBookingRecord {
  refundPoints: number;
  slotStatus: string;
  cancelledByUser: boolean;
  cancellationReason: string | null;
}

export interface CreatedBooking {
  id: string;
  resourceSlotId: string;
  resourceId: string;
  resourceName: string;
  ownerOrganizationId: string;
  userId: string;
  status: string;
  startsAt: Date;
  endsAt: Date;
  pointsDeducted: number;
  createdAt: Date;
}
