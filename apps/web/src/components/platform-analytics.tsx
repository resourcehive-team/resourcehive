"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2Icon } from "lucide-react";

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
import { getPlatformAnalytics } from "@/lib/booking-service/analytics-api";
import type { PlatformAnalytics } from "@/lib/booking-service/types";

type State =
  | { status: "loading" }
  | { status: "loaded"; analytics: PlatformAnalytics }
  | { status: "error"; error: unknown };

export function PlatformAnalyticsSection() {
  const router = useRouter();
  const [state, setState] = React.useState<State>({ status: "loading" });
  const [requestAttempt, setRequestAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();

    getPlatformAnalytics({ signal: controller.signal })
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
    return <Skeleton aria-label="Loading platform analytics" aria-busy="true" className="h-64 w-full rounded-none" />;
  }

  if (state.status === "error") {
    return (
      <RequestErrorCard
        error={state.error}
        subject="Platform analytics"
        onRetry={() => {
          setState({ status: "loading" });
          setRequestAttempt((attempt) => attempt + 1);
        }}
      />
    );
  }

  const { companies } = state.analytics;

  return (
    <Card>
      <CardHeader>
        <Building2Icon className="mb-2 size-6 text-clay" />
        <CardTitle>Companies on the platform</CardTitle>
        <CardDescription>
          Signup pace, listed inventory, and successful borrows per company
          over the last 90 days.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {companies.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No companies have been onboarded yet.
          </p>
        ) : (
          <div className="border border-line">
            {companies.map((company) => (
              <div
                key={company.organizationId}
                className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-4 last:border-b-0"
              >
                <p className="font-medium">{company.organizationName}</p>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                  <span>{company.newSignups} new signups</span>
                  <span>{company.totalItemsListed} items listed</span>
                  <span>{company.totalBorrows} borrows/shares</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
