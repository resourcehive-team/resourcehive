export interface ResourceSlot {
  id: string;
  resourceId: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  available: boolean;
  status?: string;
}

export interface CreatedBooking {
  id: string;
  resourceSlotId: string;
  resourceId: string;
  resourceName: string;
  userId: string;
  status: string;
  startsAt: string;
  endsAt: string;
  pointsDeducted: number;
  createdAt: string;
}

export interface UserBooking {
  id: string;
  resourceSlotId: string;
  userId: string;
  status: string;
  createdAt: string;
  cancelledAt?: string | null;
  completedAt?: string | null;
  resourceSlot: {
    startsAt: string;
    endsAt: string;
    resource: {
      id: string;
      name: string;
      pointCost: number;
    };
  };
}

export interface BookingMember {
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  emailVerifiedAt: string | null;
  createdAt: string;
}

export interface OrganizationBooking extends UserBooking {
  user: BookingMember;
}

export interface CancelledBooking extends OrganizationBooking {
  refundPoints: number;
  slotStatus: string;
}

export type DisputeReason =
  | "UNAVAILABLE"
  | "BROKEN"
  | "NOT_AS_DESCRIBED"
  | "OTHER";

export type DisputeStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "RESOLVED"
  | "REJECTED";

export type DisputeResourceAction = "NONE" | "MARK_UNAVAILABLE" | "RESTORE";

export interface ResourceDemand {
  resourceId: string;
  name: string;
  bookingCount: number;
}

export interface OrganizationUsage {
  organizationId: string;
  organizationName: string;
  bookingCount: number;
}

export interface PeakSlot {
  dayOfWeek: number;
  hour: number;
  bookingCount: number;
}

export interface PersonalResourceUsage extends ResourceDemand {
  totalHours: number;
}

export interface OrganizationAnalytics {
  inventoryDemand: ResourceDemand[];
  userSegmentation: OrganizationUsage[];
  peakTimes: PeakSlot[];
}

export interface PersonalAnalytics {
  usage: PersonalResourceUsage[];
  peakTimes: PeakSlot[];
}

export interface PlatformCompanyOverview {
  organizationId: string;
  organizationName: string;
  newSignups: number;
  totalItemsListed: number;
  totalBorrows: number;
}

export interface PlatformAnalytics {
  companies: PlatformCompanyOverview[];
}

export interface DisputeSubmitter {
  firstName: string;
  lastName: string;
  email: string;
}

export interface Dispute {
  id: string;
  bookingId: string;
  rootOrganizationId: string;
  resolverOrganizationId: string;
  submittedByUserId: string;
  reason: DisputeReason;
  description: string;
  evidence: string[] | null;
  status: DisputeStatus;
  resolutionNotes: string | null;
  reviewedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  /** Only present when listed via the organization/manage endpoint. */
  submittedByUser?: DisputeSubmitter;
}
