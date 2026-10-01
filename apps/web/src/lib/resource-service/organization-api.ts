import "client-only";

import { apiRequest } from "@/lib/api-client";
import { apiPathSegment } from "@/lib/resource-service/path";
import type {
  Organization,
  OrganizationDetails,
} from "@/lib/resource-service/types";

export interface OrganizationEmailDomain {
  id: string;
  organizationId: string;
  domain: string;
  autoJoin: boolean;
}

export interface OrganizationEmailAllowlistEntry {
  id: string;
  organizationId: string;
  email: string;
  addedBy: string;
  usedAt: string | null;
}

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

export function createChildOrganization(
  parentOrganizationId: string,
  input: { name: string; type: string; adminEmail: string },
): Promise<{ organization: Organization; administrator: { email: string } }> {
  const id = apiPathSegment(parentOrganizationId, "Parent organization ID");
  return apiRequest(`/organizations/${id}/children`, {
    method: "POST",
    json: input,
  });
}

export function getOrganizationEmailDomains(
  organizationId: string,
): Promise<OrganizationEmailDomain[]> {
  const id = apiPathSegment(organizationId, "Organization ID");
  return apiRequest(`/organizations/${id}/email-domains`);
}

export function addOrganizationEmailDomain(
  organizationId: string,
  domain: string,
  autoJoin: boolean,
): Promise<OrganizationEmailDomain> {
  const id = apiPathSegment(organizationId, "Organization ID");
  return apiRequest(`/organizations/${id}/email-domains`, {
    method: "POST",
    json: { domain, autoJoin },
  });
}

export function updateOrganizationEmailDomain(
  organizationId: string,
  domainId: string,
  autoJoin: boolean,
): Promise<OrganizationEmailDomain> {
  const id = apiPathSegment(organizationId, "Organization ID");
  const ruleId = apiPathSegment(domainId, "Email domain ID");
  return apiRequest(`/organizations/${id}/email-domains/${ruleId}`, {
    method: "PATCH",
    json: { autoJoin },
  });
}

export function removeOrganizationEmailDomain(
  organizationId: string,
  domainId: string,
): Promise<void> {
  const id = apiPathSegment(organizationId, "Organization ID");
  const ruleId = apiPathSegment(domainId, "Email domain ID");
  return apiRequest(`/organizations/${id}/email-domains/${ruleId}`, {
    method: "DELETE",
  });
}

export function getOrganizationAllowlist(
  organizationId: string,
): Promise<OrganizationEmailAllowlistEntry[]> {
  const id = apiPathSegment(organizationId, "Organization ID");
  return apiRequest(`/organizations/${id}/allowlist`);
}

export function addOrganizationAllowlistEmail(
  organizationId: string,
  email: string,
): Promise<OrganizationEmailAllowlistEntry> {
  const id = apiPathSegment(organizationId, "Organization ID");
  return apiRequest(`/organizations/${id}/allowlist`, {
    method: "POST",
    json: { email },
  });
}

export function removeOrganizationAllowlistEmail(
  organizationId: string,
  entryId: string,
): Promise<void> {
  const id = apiPathSegment(organizationId, "Organization ID");
  const ruleId = apiPathSegment(entryId, "Allowlist entry ID");
  return apiRequest(`/organizations/${id}/allowlist/${ruleId}`, {
    method: "DELETE",
  });
}

export function allocateSemesterPoints(
  rootOrganizationId: string,
  targetOrganizationIds: string[],
  amount: number,
  semesterName: string,
): Promise<{ count: number }> {
  const id = apiPathSegment(rootOrganizationId, "Root organization ID");

  return apiRequest<{ count: number }>(`/organizations/${id}/semester-points`, {
    method: "POST",
    json: {
      targetOrganizationIds,
      amount,
      semesterName,
    },
  });
}
