import Link from "next/link";
import { CoinsIcon, PackageIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatOrganizationDate,
  formatOrganizationLabel,
  formatOrganizationPoints,
} from "@/lib/resource-service/organization-format";
import type { Resource } from "@/lib/resource-service/types";

export function ResourceCatalogueCard({
  accessOrganizationId,
  accessOrganizationName,
  resource,
}: {
  accessOrganizationId: string;
  accessOrganizationName?: string;
  resource: Resource;
}) {
  const isOwnedByAccessOrganization =
    resource.ownerOrganizationId === accessOrganizationId;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackageIcon className="size-4" />
          <Link
            className="underline decoration-line underline-offset-4 transition-colors hover:text-terracotta hover:decoration-terracotta"
            href={`/dashboard/resources/${encodeURIComponent(resource.id)}?organization=${encodeURIComponent(accessOrganizationId)}`}
          >
            {resource.name}
          </Link>
        </CardTitle>
        <CardDescription>
          {resource.description || "No description provided."}
        </CardDescription>
        <CardAction>
          <Badge variant={resourceStatusVariant(resource.status)}>
            {formatOrganizationLabel(resource.status)}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3">
          <div className="flex items-center justify-between gap-4">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <CoinsIcon className="size-4" />
              Point cost
            </dt>
            <dd className="font-medium">
              {formatOrganizationPoints(resource.pointCost)} points
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Access</dt>
            <dd className="font-medium">
              {isOwnedByAccessOrganization ? "Owned by" : "Shared with"} {" "}
              {accessOrganizationName ?? "your organization"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Added</dt>
            <dd className="font-medium">
              <time dateTime={resource.createdAt}>
                {formatOrganizationDate(resource.createdAt)}
              </time>
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function resourceStatusVariant(
  status: string,
): "default" | "destructive" | "outline" {
  const normalizedStatus = status.toUpperCase();

  if (normalizedStatus === "ACTIVE") {
    return "default";
  }

  if (normalizedStatus === "ARCHIVED") {
    return "destructive";
  }

  return "outline";
}
