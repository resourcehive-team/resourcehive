import { Badge } from "@/components/ui/badge";
import { formatOrganizationLabel } from "@/lib/resource-service/organization-format";
import type { DisputeStatus } from "@/lib/booking-service/types";

export function DisputeStatusBadge({ status }: { status: DisputeStatus }) {
  return (
    <Badge variant={disputeStatusVariant(status)}>
      {formatOrganizationLabel(status)}
    </Badge>
  );
}

function disputeStatusVariant(
  status: DisputeStatus,
): "success" | "warning" | "destructive" | "outline" {
  if (status === "RESOLVED") {
    return "success";
  }

  if (status === "UNDER_REVIEW") {
    return "warning";
  }

  if (status === "REJECTED") {
    return "destructive";
  }

  return "outline";
}
