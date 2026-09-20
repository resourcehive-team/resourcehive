"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChartColumnIcon } from "lucide-react";

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
import { getPersonalAnalytics } from "@/lib/booking-service/analytics-api";
import type { PersonalAnalytics } from "@/lib/booking-service/types";

type State =
  | { status: "loading" }
  | { status: "loaded"; analytics: PersonalAnalytics }
  | { status: "error"; error: unknown };

export function PersonalAnalyticsSection() {
  const router = useRouter();
  const [state, setState] = React.useState<State>({ status: "loading" });
  const [requestAttempt, setRequestAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();

    getPersonalAnalytics({ signal: controller.signal })
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
    return <PersonalAnalyticsSkeleton />;
  }

  if (state.status === "error") {
    return (
      <RequestErrorCard
        error={state.error}
        subject="Personal analytics"
        onRetry={() => {
          setState({ status: "loading" });
          setRequestAttempt((attempt) => attempt + 1);
        }}
      />
    );
  }

  const { usage, peakTimes } = state.analytics;

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Your usage by resource</CardTitle>
          <CardDescription>
            Bookings and hours logged over the last 90 days, by resource.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usage.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No bookings in this range yet.
            </p>
          ) : (
            <div className="border border-line">
              {usage.map((resource) => (
                <div
                  key={resource.resourceId}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 last:border-b-0"
                >
                  <p className="font-medium">{resource.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {resource.bookingCount} booking
                    {resource.bookingCount === 1 ? "" : "s"} ·{" "}
                    {resource.totalHours.toFixed(1)} hours
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <ChartColumnIcon className="mb-2 size-6 text-clay" />
          <CardTitle>Peak booking times</CardTitle>
          <CardDescription>
            Busiest hours and days across your tenant, so you can plan around
            them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PeakTimesHeatmap peakTimes={peakTimes} />
        </CardContent>
      </Card>
    </div>
  );
}

function PersonalAnalyticsSkeleton() {
  return (
    <div
      aria-label="Loading personal analytics"
      aria-busy="true"
      className="grid gap-6"
    >
      <Skeleton className="h-40 w-full rounded-none" />
      <Skeleton className="h-48 w-full rounded-none" />
    </div>
  );
}
