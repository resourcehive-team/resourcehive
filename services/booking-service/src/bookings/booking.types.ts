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
}

export interface CreatedBooking {
  id: string;
  resourceSlotId: string;
  resourceId: string;
  resourceName: string;
  userId: string;
  status: string;
  startsAt: Date;
  endsAt: Date;
  pointsDeducted: number;
  createdAt: Date;
}
