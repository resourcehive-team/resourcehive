"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2Icon } from "lucide-react";

import { CategoryLineChart } from "@/components/category-line-chart";
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

  if (companies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <Building2Icon className="mb-2 size-6 text-clay" />
          <CardTitle>Companies on the platform</CardTitle>
          <CardDescription>
            No companies have been onboarded yet.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const chartData = companies.map((company) => ({
    name: company.organizationName,
    newSignups: company.newSignups,
    totalItemsListed: company.totalItemsListed,
    totalBorrows: company.totalBorrows,
  }));

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <Building2Icon className="mb-2 size-6 text-clay" />
          <CardTitle>New signups</CardTitle>
          <CardDescription>
            How fast each company is adding new users to the platform, over
            the last 90 days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryLineChart
            data={chartData}
            categoryKey="name"
            series={[{ key: "newSignups", label: "New signups" }]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Total items listed</CardTitle>
          <CardDescription>
            The total number of resources each company has uploaded to the
            platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryLineChart
            data={chartData}
            categoryKey="name"
            series={[
              {
                key: "totalItemsListed",
                label: "Items listed",
                color: "var(--chart-3)",
              },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Total borrows/shares</CardTitle>
          <CardDescription>
            Successful bookings each company has made over the last 90 days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryLineChart
            data={chartData}
            categoryKey="name"
            series={[
              {
                key: "totalBorrows",
                label: "Borrows/shares",
                color: "var(--chart-4)",
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
