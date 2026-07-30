"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircleIcon, Building2Icon, RefreshCwIcon } from "lucide-react";

import {
  ApiAuthenticationError,
  ApiError,
  ApiNetworkError,
} from "@/lib/api-client";
import { getRootOrganizations } from "@/lib/resource-service/organization-api";
import type { Organization } from "@/lib/resource-service/types";
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

export function RootOrganizationList() {
  const router = useRouter();
  const [organizations, setOrganizations] = React.useState<
    Organization[] | null
  >(null);
  const [error, setError] = React.useState<unknown>(null);
  const [requestAttempt, setRequestAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();

    getRootOrganizations(controller.signal)
      .then((rootOrganizations) => {
        setOrganizations(rootOrganizations);
        setError(null);
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setError(requestError);

        if (requestError instanceof ApiAuthenticationError) {
          router.replace("/login");
          router.refresh();
        }
      });

    return () => controller.abort();
  }, [requestAttempt, router]);

  function retryRequest() {
    setOrganizations(null);
    setError(null);
    setRequestAttempt((attempt) => attempt + 1);
  }

  if (error) {
    return (
      <OrganizationListError error={error} onRetry={retryRequest} />
    );
  }

  if (organizations === null) {
    return <RootOrganizationListSkeleton />;
  }

  if (organizations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No organizations available</CardTitle>
          <CardDescription>
            Root organizations will appear here after they are added to
            ResourceHive.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {organizations.map((organization) => (
        <OrganizationCard
          key={organization.id}
          organization={organization}
        />
      ))}
    </div>
  );
}

function OrganizationCard({
  organization,
}: {
  organization: Organization;
}) {
  const status = formatLabel(organization.status);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2Icon className="size-4" />
          {organization.name}
        </CardTitle>
        <CardDescription>{formatLabel(organization.type)}</CardDescription>
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
              {formatPoints(organization.joinBonusPoints)} points
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Added</dt>
            <dd className="font-medium">
              <time dateTime={organization.createdAt}>
                {formatDate(organization.createdAt)}
              </time>
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function RootOrganizationListSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading organizations"
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: 3 }, (_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent className="grid gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function OrganizationListError({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  const message = getErrorMessage(error);
  const canRetry = !(error instanceof ApiAuthenticationError);

  return (
    <Card role="alert">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircleIcon className="size-4" />
          {message.title}
        </CardTitle>
        <CardDescription>{message.description}</CardDescription>
      </CardHeader>
      {canRetry ? (
        <CardContent>
          <Button variant="outline" onClick={onRetry}>
            <RefreshCwIcon data-icon="inline-start" />
            Try again
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}

function getErrorMessage(error: unknown): {
  title: string;
  description: string;
} {
  if (error instanceof ApiAuthenticationError) {
    return {
      title: "Your session has expired",
      description: "Redirecting you to the login page.",
    };
  }

  if (error instanceof ApiError && error.status === 403) {
    return {
      title: "Organizations are unavailable",
      description:
        "Your account does not have permission to view these organizations.",
    };
  }

  if (error instanceof ApiNetworkError) {
    return {
      title: "ResourceHive could not be reached",
      description:
        "Check your connection and make sure the API gateway is running.",
    };
  }

  return {
    title: "Organizations could not be loaded",
    description: "Please try again. If the problem continues, contact support.",
  };
}

function formatLabel(value: string): string {
  const label = value.trim().replaceAll(/[_-]+/g, " ").toLowerCase();

  if (!label) {
    return "Unknown";
  }

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatPoints(points: number): string {
  return new Intl.NumberFormat().format(points);
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
}
