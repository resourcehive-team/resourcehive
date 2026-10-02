import "client-only";

import { apiRequest } from "@/lib/api-client";
import { apiPathSegment } from "@/lib/resource-service/path";
import type {
  Membership,
  MembershipWithOrganization,
  OrganizationMember,
  ChildOrganizationAdministrators,
} from "@/lib/resource-service/types";

export function requestOrganizationMembership(
  organizationId: string,
  signal?: AbortSignal,
): Promise<Membership> {
  const id = apiPathSegment(organizationId, "Organization ID");

  return apiRequest<Membership>(`/memberships/${id}/request`, {
    method: "POST",
    signal,
  });
}

export function getCurrentUserMemberships(
  signal?: AbortSignal,
): Promise<MembershipWithOrganization[]> {
  return apiRequest<MembershipWithOrganization[]>(
    "/memberships/my-memberships",
    { signal },
  );
}

export function getOrganizationMembers(
  organizationId: string,
  signal?: AbortSignal,
): Promise<OrganizationMember[]> {
  const id = apiPathSegment(organizationId, "Organization ID");

  return apiRequest<OrganizationMember[]>(
    `/memberships/organization/${id}`,
    { signal },
  );
}

export function approveOrganizationMembership(
  organizationId: string,
  userId: string,
): Promise<Membership> {
  const organization = apiPathSegment(organizationId, "Organization ID");
  const user = apiPathSegment(userId, "User ID");
  return apiRequest<Membership>(
    `/memberships/organization/${organization}/users/${user}/approve`,
    { method: "PATCH" },
  );
}

export function rejectOrganizationMembership(
  organizationId: string,
  userId: string,
  reason?: string,
): Promise<Membership> {
  const organization = apiPathSegment(organizationId, "Organization ID");
  const user = apiPathSegment(userId, "User ID");
  return apiRequest<Membership>(
    `/memberships/organization/${organization}/users/${user}/reject`,
    {
      method: "PATCH",
      json: { ...(reason?.trim() ? { reason: reason.trim() } : {}) },
    },
  );
}

export function getChildOrganizationAdministrators(
  organizationId: string,
  signal?: AbortSignal,
): Promise<ChildOrganizationAdministrators[]> {
  const id = apiPathSegment(organizationId, "Organization ID");
  return apiRequest<ChildOrganizationAdministrators[]>(
    `/memberships/organization/${id}/child-administrators`,
    { signal },
  );
}

export function appointChildOrganizationAdministrator(
  organizationId: string,
  childOrganizationId: string,
  email: string,
): Promise<unknown> {
  const parent = apiPathSegment(organizationId, "Organization ID");
  const child = apiPathSegment(childOrganizationId, "Child organization ID");
  return apiRequest<unknown>(
    `/memberships/organization/${parent}/children/${child}/administrators`,
    { method: "PUT", json: { email } },
  );
}

export function revokeChildOrganizationAdministrator(
  organizationId: string,
  childOrganizationId: string,
  userId: string,
): Promise<unknown> {
  const parent = apiPathSegment(organizationId, "Organization ID");
  const child = apiPathSegment(childOrganizationId, "Child organization ID");
  const user = apiPathSegment(userId, "User ID");
  return apiRequest<unknown>(
    `/memberships/organization/${parent}/children/${child}/administrators/${user}`,
    { method: "DELETE" },
  );
}
