import Link from "next/link";
import { ArrowRightIcon, Building2Icon } from "lucide-react";

import {
  formatOrganizationDate,
  formatOrganizationLabel,
  formatOrganizationPoints,
} from "@/lib/resource-service/organization-format";
import type { Organization } from "@/lib/resource-service/types";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function OrganizationSummaryCard({
  organization,
}: {
  organization: Organization;
}) {
  const status = formatOrganizationLabel(organization.status);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2Icon className="size-4" />
          {organization.name}
        </CardTitle>
        <CardDescription>
          {formatOrganizationLabel(organization.type)}
        </CardDescription>
        <CardAction>
          <Badge
            variant={
              organization.status.toUpperCase() === "ACTIVE"
                ? "default"
                : "outline"
            }
          >
            {status}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Joining bonus</dt>
            <dd className="font-medium">
              {formatOrganizationPoints(organization.joinBonusPoints)} points
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Added</dt>
            <dd className="font-medium">
              <time dateTime={organization.createdAt}>
                {formatOrganizationDate(organization.createdAt)}
              </time>
            </dd>
          </div>
        </dl>
      </CardContent>
      <CardFooter>
        <Link
          className={buttonVariants({ variant: "outline" })}
          href={`/dashboard/organizations/${encodeURIComponent(organization.id)}`}
        >
          View details
          <ArrowRightIcon data-icon="inline-end" />
        </Link>
      </CardFooter>
    </Card>
  );
}
