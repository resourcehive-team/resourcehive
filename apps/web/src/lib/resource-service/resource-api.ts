import "client-only";

import { apiRequest } from "@/lib/api-client";
import { apiPathSegment } from "@/lib/resource-service/path";
import type {
  PaginatedResources,
  Resource,
  ResourceDetails,
  ResourceRating,
  ResourceRatingSummary,
} from "@/lib/resource-service/types";

export interface CreateResourceInput {
  name: string;
  description?: string;
  pointCost?: number;
  allowedOrganizationIds?: string[];
}

export interface ResourceListOptions {
  page?: number;
  limit?: number;
  search?: string;
  signal?: AbortSignal;
}

export interface SubmitRatingInput {
  rating: number;
  comment?: string;
}

export function createResource(
  organizationId: string,
  input: CreateResourceInput,
): Promise<Resource> {
  const ownerOrganizationId = organizationId.trim();
  const owner = apiPathSegment(ownerOrganizationId, "Organization ID");
  const name = input.name.trim();
  const description = input.description?.trim();
  const pointCost = input.pointCost ?? 0;

  if (!name) {
    throw new Error("Resource name is required.");
  }

  if (!Number.isInteger(pointCost) || pointCost < 0) {
    throw new Error("Point cost must be a non-negative integer.");
  }

  const allowedOrganizationIds = [
    ...new Set([
      ownerOrganizationId,
      ...(input.allowedOrganizationIds ?? []).map((id) => {
        const normalizedId = id.trim();

        if (!normalizedId) {
          throw new Error("Allowed organization ID is required.");
        }

        return normalizedId;
      }),
    ]),
  ];

  return apiRequest<Resource>(`/resources/organization/${owner}`, {
    method: "POST",
    json: {
      name,
      ...(description ? { description } : {}),
      pointCost,
      allowedOrganizationIds,
    },
  });
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

export function getResourceRatings(
  organizationId: string,
  resourceId: string,
  signal?: AbortSignal,
): Promise<ResourceRatingSummary> {
  const organization = apiPathSegment(organizationId, "Organization ID");
  const resource = apiPathSegment(resourceId, "Resource ID");

  return apiRequest<ResourceRatingSummary>(
    `/resources/organization/${organization}/${resource}/ratings`,
    { signal },
  );
}

export function submitResourceRating(
  organizationId: string,
  resourceId: string,
  input: SubmitRatingInput,
): Promise<ResourceRating> {
  const organization = apiPathSegment(organizationId, "Organization ID");
  const resource = apiPathSegment(resourceId, "Resource ID");

  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new Error("Rating must be an integer between 1 and 5.");
  }

  return apiRequest<ResourceRating>(
    `/resources/organization/${organization}/${resource}/ratings`,
    {
      method: "POST",
      json: {
        rating: input.rating,
        ...(input.comment?.trim() ? { comment: input.comment.trim() } : {}),
      },
    },
  );
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return value;
}

export interface ResourceImageUploadResponse {
  imageUrl: string;
}

export function uploadResourceImage(
  organizationId: string,
  resourceId: string,
  file: File,
): Promise<ResourceImageUploadResponse> {
  const organization = apiPathSegment(organizationId, "Organization ID");
  const resource = apiPathSegment(resourceId, "Resource ID");

  const formData = new FormData();
  formData.append("file", file);

  return apiRequest<ResourceImageUploadResponse>(
    `/resources/organization/${organization}/${resource}/image`,
    {
      method: "POST",
      body: formData,
    },
  );
}
