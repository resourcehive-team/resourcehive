import type { DisputeReason } from "@/lib/booking-service/types";

export function formatDisputeReason(reason: DisputeReason): string {
  switch (reason) {
    case "UNAVAILABLE":
      return "Resource was unavailable";
    case "BROKEN":
      return "Resource was broken";
    case "NOT_AS_DESCRIBED":
      return "Resource didn't match the description";
    default:
      return "Other issue";
  }
}
