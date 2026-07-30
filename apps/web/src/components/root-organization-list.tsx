"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { OrganizationSummaryCard } from "@/components/organization-summary-card";
import { RequestErrorCard } from "@/components/request-error-card";
import { ApiAuthenticationError } from "@/lib/api-client";
import { getRootOrganizations } from "@/lib/resource-service/organization-api";
import type { Organization } from "@/lib/resource-service/types";
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
      <RequestErrorCard
        error={error}
        subject="Organizations"
        onRetry={retryRequest}
      />
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
