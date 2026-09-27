"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BoxesIcon, ChartColumnIcon, UsersIcon } from "lucide-react";

import { HorizontalBarChart } from "@/components/horizontal-bar-chart";
import { PeakTimesHeatmap } from "@/components/peak-times-heatmap";
import { RequestErrorCard } from "@/components/request-error-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiAuthenticationError } from "@/lib/api-client";
import { getOrganizationAnalytics } from "@/lib/booking-service/analytics-api";
import type { OrganizationAnalytics } from "@/lib/booking-service/types";

type State =
  | { status: "loading" }
  | { status: "loaded"; analytics: OrganizationAnalytics }
  | { status: "error"; error: unknown };

export function OrganizationAnalyticsSection() {
  const router = useRouter();
  const [state, setState] = React.useState<State>({ status: "loading" });
  const [requestAttempt, setRequestAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();

    getOrganizationAnalytics({ signal: controller.signal })
      .then((analytics) => {
        setState({ status: "loaded", analytics });
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setState({ status: "error", error: requestError });

        if (requestError instanceof ApiAuthenticationError) {
          router.replace("/login");
          router.refresh();
        }
      });

    return () => controller.abort();
  }, [requestAttempt, router]);

  if (state.status === "loading") {
    return <OrganizationAnalyticsSkeleton />;
  }

  if (state.status === "error") {
    return (
      <RequestErrorCard
        error={state.error}
        subject="Organization analytics"
        onRetry={() => {
          setState({ status: "loading" });
          setRequestAttempt((attempt) => attempt + 1);
        }}
      />
    );
  }

  const { inventoryDemand, userSegmentation, peakTimes } = state.analytics;

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <BoxesIcon className="mb-2 size-6 text-clay" />
          <CardTitle>Inventory demand</CardTitle>
          <CardDescription>
            Bookings per resource over the last 90 days. Low counts may
            signal a surplus, high counts a shortage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inventoryDemand.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No resources found for organizations you administer.
            </p>
          ) : (
            <HorizontalBarChart
              data={inventoryDemand.map((resource) => ({
                label: resource.name,
                value: resource.bookingCount,
              }))}
              valueLabel="Bookings"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <UsersIcon className="mb-2 size-6 text-clay" />
          <CardTitle>User segmentation</CardTitle>
          <CardDescription>
            Which organizations book your resources the most.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userSegmentation.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No bookings in this range yet.
            </p>
          ) : (
            <HorizontalBarChart
              data={userSegmentation.map((organization) => ({
                label: organization.organizationName,
                value: organization.bookingCount,
              }))}
              valueLabel="Bookings"
              color="var(--chart-3)"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <ChartColumnIcon className="mb-2 size-6 text-clay" />
          <CardTitle>Peak times and days</CardTitle>
          <CardDescription>
            The busiest hours and days of the week for resources you
            administer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PeakTimesHeatmap peakTimes={peakTimes} />
        </CardContent>
      </Card>
    </div>
  );
}

function OrganizationAnalyticsSkeleton() {
  return (
    <div
      aria-label="Loading organization analytics"
      aria-busy="true"
      className="grid gap-6"
    >
      <Skeleton className="h-40 w-full rounded-none" />
      <Skeleton className="h-40 w-full rounded-none" />
      <Skeleton className="h-48 w-full rounded-none" />
    </div>
  );
}
