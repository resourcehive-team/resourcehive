export interface Organization {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
  rootOrganizationId: string;
  joinBonusPoints: number;
  status: string;
  createdBy: string;
  createdAt: string;
}

export interface OrganizationDetails extends Organization {
  children: Organization[];
}

export interface Membership {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  status: string;
  joinedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  latestAudit: MembershipAudit | null;
}

export interface MembershipAudit {
  id: string;
  membershipId: string;
  actorUserId: string;
  action: string;
  note: string | null;
  createdAt: string;
}

export interface MembershipWithOrganization extends Membership {
  organization: Organization;
}

export interface OrganizationMemberUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  status: string;
}

export interface OrganizationMember {
  userId: string;
  organizationId: string;
  role: string;
  status: string;
  joinedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  latestAudit: MembershipAudit | null;
  user: OrganizationMemberUser;
}

export interface ChildOrganizationAdministrators {
  id: string;
  name: string;
  type: string;
  status: string;
  administrators: Array<{
    userId: string;
    organizationId: string;
    user: OrganizationMemberUser;
  }>;
}

export interface AllowedOrganization {
  resourceId: string;
  organizationId: string;
  rootOrganizationId: string;
}

export interface Resource {
  id: string;
  name: string;
  description: string | null;
  ownerOrganizationId: string;
  rootOrganizationId: string;
  createdByUserId: string;
  status: string;
  pointCost: number;
  cancellationNoticeMinutes: number;
  createdAt: string;
  imageUrl: string | null;
  allowedOrganizations: AllowedOrganization[];
  ratingSummary?: {
    average: number;
    total: number;
  };
}

export interface ResourceDetails extends Resource {
  ownerOrganization: Organization;
}

export interface PaginatedResources {
  data: Resource[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ResourceRating {
  id: string;
  resourceId: string;
  userId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
  };
}

export type ResourceRatingSubmission = Omit<ResourceRating, "user">;

export interface ResourceRatingSummary {
  average: number;
  total: number;
  ratings: ResourceRating[];
}
