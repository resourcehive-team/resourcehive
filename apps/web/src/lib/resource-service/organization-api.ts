import "client-only";

import { apiRequest } from "@/lib/api-client";
import { apiPathSegment } from "@/lib/resource-service/path";
import type {
  Organization,
  OrganizationDetails,
} from "@/lib/resource-service/types";

export function getRootOrganizations(
  signal?: AbortSignal,
): Promise<Organization[]> {
  return apiRequest<Organization[]>("/organizations/roots", { signal });
}

export function getOrganizationDetails(
  organizationId: string,
  signal?: AbortSignal,
): Promise<OrganizationDetails | null> {
  const id = apiPathSegment(organizationId, "Organization ID");

  return apiRequest<OrganizationDetails | null>(`/organizations/${id}`, {
    signal,
  });
}

export function getRootOrganizationDescendants(
  rootOrganizationId: string,
  signal?: AbortSignal,
): Promise<Organization[]> {
  const id = apiPathSegment(rootOrganizationId, "Root organization ID");

  return apiRequest<Organization[]>(`/organizations/${id}/children`, {
    signal,
  });
}
