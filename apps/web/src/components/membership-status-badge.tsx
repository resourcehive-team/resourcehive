import { Badge } from "@/components/ui/badge";
import { formatOrganizationLabel } from "@/lib/resource-service/organization-format";

export function MembershipStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={membershipStatusVariant(status.toUpperCase())}>
      {formatOrganizationLabel(status)}
    </Badge>
  );
}

function membershipStatusVariant(
  status: string,
): "success" | "warning" | "destructive" | "outline" {
  if (status === "APPROVED") {
    return "success";
  }

  if (status === "PENDING") {
    return "warning";
  }

  if (status === "REJECTED") {
    return "destructive";
  }

  return "outline";
}
