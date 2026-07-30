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
  approvedBy: string | null;
}

export interface MembershipWithOrganization extends Membership {
  organization: Organization;
}

export interface OrganizationMemberUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
}

export interface OrganizationMember {
  userId: string;
  organizationId: string;
  role: string;
  status: string;
  joinedAt: string;
  user: OrganizationMemberUser;
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
  createdAt: string;
  allowedOrganizations: AllowedOrganization[];
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
