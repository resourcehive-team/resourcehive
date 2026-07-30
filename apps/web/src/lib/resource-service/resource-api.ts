import "client-only";

import { apiRequest } from "@/lib/api-client";
import { apiPathSegment } from "@/lib/resource-service/path";
import type {
  PaginatedResources,
  ResourceDetails,
} from "@/lib/resource-service/types";

export interface ResourceListOptions {
  page?: number;
  limit?: number;
  search?: string;
  signal?: AbortSignal;
}

export function getAccessibleResources(
  organizationId: string,
  options: ResourceListOptions = {},
): Promise<PaginatedResources> {
  const id = apiPathSegment(organizationId, "Organization ID");
  const page = positiveInteger(options.page ?? 1, "Page");
  const limit = positiveInteger(options.limit ?? 10, "Limit");
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const search = options.search?.trim();

  if (search) {
    query.set("search", search);
  }

  return apiRequest<PaginatedResources>(
    `/resources/organization/${id}?${query.toString()}`,
    { signal: options.signal },
  );
}

export function getResourceDetails(
  organizationId: string,
  resourceId: string,
  signal?: AbortSignal,
): Promise<ResourceDetails> {
  const organization = apiPathSegment(organizationId, "Organization ID");
  const resource = apiPathSegment(resourceId, "Resource ID");

  return apiRequest<ResourceDetails>(
    `/resources/organization/${organization}/${resource}`,
    { signal },
  );
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return value;
}
