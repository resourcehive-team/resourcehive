import { Prisma } from "@resourcehive/database";

export type DisputeTransactionClient = Pick<
  Prisma.TransactionClient,
  "booking" | "bookingDispute" | "bookingDisputeEvent" | "resource"
>;

export const DISPUTE_REASONS = [
  "NOT_RETURNED",
  "DAMAGED",
  "MISPLACED",
  "OTHER",
] as const;
export type DisputeReason = (typeof DISPUTE_REASONS)[number];

export const DISPUTE_STATUSES = [
  "OPEN",
  "UNDER_REVIEW",
  "RESOLVED",
  "REJECTED",
] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export const RESOURCE_ACTIONS = [
  "NONE",
  "MARK_UNAVAILABLE",
  "RESTORE",
] as const;
export type ResourceAction = (typeof RESOURCE_ACTIONS)[number];

export interface CreateDisputeInput {
  bookingId: string;
  submittedByUserId: string;
  reason: DisputeReason;
  description: string;
  evidence?: string[];
}

export interface TransitionDisputeInput {
  status?: DisputeStatus;
  resolutionNotes?: string;
  resourceAction?: ResourceAction;
}

export interface DisputeRecord {
  id: string;
  bookingId: string;
  rootOrganizationId: string;
  submittedByUserId: string;
  reason: string;
  description: string;
  evidence: unknown;
  status: string;
  resolutionNotes: string | null;
  reviewedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
}

export interface DisputeWithBookingContext extends DisputeRecord {
  booking: {
    userId: string;
    status: string;
    resourceSlot: {
      resource: {
        id: string;
        ownerOrganizationId: string;
        unavailableDisputeId: string | null;
      };
    };
  };
}
