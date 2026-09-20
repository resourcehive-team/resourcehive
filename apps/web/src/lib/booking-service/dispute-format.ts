import type { DisputeReason } from "@/lib/booking-service/types";

export function formatDisputeReason(reason: DisputeReason): string {
  switch (reason) {
    case "NOT_RETURNED":
      return "Resource was not returned";
    case "DAMAGED":
      return "Resource was damaged";
    case "MISPLACED":
      return "Resource was misplaced";
    default:
      return "Other issue";
  }
}
