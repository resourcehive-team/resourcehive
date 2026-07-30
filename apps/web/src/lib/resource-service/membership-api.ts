import "client-only";

import { apiRequest } from "@/lib/api-client";
import { apiPathSegment } from "@/lib/resource-service/path";
import type {
  Membership,
  MembershipWithOrganization,
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
