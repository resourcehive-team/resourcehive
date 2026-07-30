"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { RequestErrorCard } from "@/components/request-error-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiAuthenticationError, ApiError } from "@/lib/api-client";
import {
  formatOrganizationDate,
  formatOrganizationLabel,
  formatOrganizationPoints,
} from "@/lib/resource-service/organization-format";
import { getOrganizationDetails } from "@/lib/resource-service/organization-api";
import type { OrganizationDetails } from "@/lib/resource-service/types";

type DetailsState =
  | { status: "loading" }
  | { status: "loaded"; organization: OrganizationDetails | null }
  | { status: "error"; error: unknown };

export function OrganizationDetailsView({
  organizationId,
}: {
  organizationId: string;
}) {
  const router = useRouter();
  const [state, setState] = React.useState<DetailsState>({
    status: "loading",
  });
  const [requestAttempt, setRequestAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();

    getOrganizationDetails(organizationId, controller.signal)
      .then((organization) => {
        setState({ status: "loaded", organization });
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        if (requestError instanceof ApiError && requestError.status === 404) {
          setState({ status: "loaded", organization: null });
          return;
        }

        setState({ status: "error", error: requestError });

        if (requestError instanceof ApiAuthenticationError) {
          router.replace("/login");
          router.refresh();
        }
      });

    return () => controller.abort();
  }, [organizationId, requestAttempt, router]);

  function retryRequest() {
    setState({ status: "loading" });
    setRequestAttempt((attempt) => attempt + 1);
  }

  if (state.status === "loading") {
    return <OrganizationDetailsSkeleton />;
  }

  if (state.status === "error") {
    return (
      <RequestErrorCard
        error={state.error}
        subject="Organization"
        onRetry={retryRequest}
      />
    );
  }

  if (state.organization === null) {
    return <OrganizationNotFound />;
  }

  return <OrganizationOverview organization={state.organization} />;
}

function OrganizationOverview({
  organization,
}: {
  organization: OrganizationDetails;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">
            {organization.name}
          </h2>
          <p className="text-muted-foreground">
            {formatOrganizationLabel(organization.type)}
          </p>
        </div>
        <Badge
          variant={
            organization.status.toUpperCase() === "ACTIVE"
              ? "default"
              : "outline"
          }
        >
          {formatOrganizationLabel(organization.status)}
        </Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Organization information</CardTitle>
          <CardDescription>
            General information configured for this organization.
          </CardDescription>
          <CardAction>
            <Badge variant="secondary">
              {organization.parentId === null
                ? "Root organization"
                : "Child organization"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-muted-foreground">Organization type</dt>
              <dd className="font-medium">
                {formatOrganizationLabel(organization.type)}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">Joining bonus</dt>
              <dd className="font-medium">
                {formatOrganizationPoints(organization.joinBonusPoints)} points
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium">
                {formatOrganizationLabel(organization.status)}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">Added</dt>
              <dd className="font-medium">
                <time dateTime={organization.createdAt}>
                  {formatOrganizationDate(organization.createdAt)}
                </time>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function OrganizationNotFound() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization not found</CardTitle>
        <CardDescription>
          This organization may no longer exist or the link may be incorrect.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          render={<Link href="/dashboard/organizations" />}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Back to organizations
        </Button>
      </CardContent>
    </Card>
  );
}

function OrganizationDetailsSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading organization details"
      className="flex flex-col gap-6"
    >
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-36" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
