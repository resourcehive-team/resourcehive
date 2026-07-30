"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircleIcon, RefreshCwIcon } from "lucide-react";

import { OrganizationSummaryCard } from "@/components/organization-summary-card";
import {
  ApiAuthenticationError,
  ApiError,
  ApiNetworkError,
} from "@/lib/api-client";
import { getRootOrganizations } from "@/lib/resource-service/organization-api";
import type { Organization } from "@/lib/resource-service/types";
import { Button } from "@/components/ui/button";
import {
  Card,
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
        <OrganizationSummaryCard
          key={organization.id}
          organization={organization}
        />
      ))}
    </div>
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
  const canRetry =
    !(error instanceof ApiAuthenticationError) &&
    !(error instanceof ApiError && error.status === 403);

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
