import "client-only";

import { apiRequest } from "@/lib/api-client";
import { apiPathSegment } from "@/lib/resource-service/path";
import type {
  Dispute,
  DisputeReason,
  DisputeResourceAction,
  DisputeStatus,
} from "@/lib/booking-service/types";

export interface OpenDisputeInput {
  bookingId: string;
  reason: DisputeReason;
  description: string;
  evidence?: string[];
}

export interface UpdateDisputeInput {
  status?: DisputeStatus;
  resolutionNotes?: string;
  resourceAction?: DisputeResourceAction;
}

export function openDispute(input: OpenDisputeInput): Promise<Dispute> {
  const bookingId = input.bookingId.trim();
  const description = input.description.trim();

  if (!bookingId) {
    throw new Error("Booking ID is required.");
  }

  if (!description) {
    throw new Error("A description of the issue is required.");
  }

  return apiRequest<Dispute>("/disputes", {
    method: "POST",
    json: {
      bookingId,
      reason: input.reason,
      description,
      ...(input.evidence && input.evidence.length > 0
        ? { evidence: input.evidence }
        : {}),
    },
  });
}

export function getMyDisputes(signal?: AbortSignal): Promise<Dispute[]> {
  return apiRequest<Dispute[]>("/disputes/me", { signal });
}

export function getOrganizationDisputes(
  signal?: AbortSignal,
): Promise<Dispute[]> {
  return apiRequest<Dispute[]>("/disputes/org", { signal });
}

export function getDispute(
  disputeId: string,
  signal?: AbortSignal,
): Promise<Dispute> {
  const dispute = apiPathSegment(disputeId, "Dispute ID");

  return apiRequest<Dispute>(`/disputes/${dispute}`, { signal });
}

export function updateDispute(
  disputeId: string,
  input: UpdateDisputeInput,
): Promise<Dispute> {
  const dispute = apiPathSegment(disputeId, "Dispute ID");
  const resolutionNotes = input.resolutionNotes?.trim();

  return apiRequest<Dispute>(`/disputes/${dispute}`, {
    method: "PATCH",
    json: {
      ...(input.status ? { status: input.status } : {}),
      ...(resolutionNotes ? { resolutionNotes } : {}),
      ...(input.resourceAction ? { resourceAction: input.resourceAction } : {}),
    },
  });
}
