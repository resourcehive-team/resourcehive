"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { GavelIcon } from "lucide-react";

import { DisputeStatusBadge } from "@/components/dispute-status-badge";
import { RequestErrorCard } from "@/components/request-error-card";
import { ReviewDisputeDialog } from "@/components/review-dispute-dialog";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiAuthenticationError } from "@/lib/api-client";
import { getOrganizationDisputes } from "@/lib/booking-service/dispute-api";
import { formatDisputeReason } from "@/lib/booking-service/dispute-format";
import type { Dispute } from "@/lib/booking-service/types";
import { formatOrganizationDate } from "@/lib/resource-service/organization-format";

type State =
  | { status: "loading" }
  | { status: "loaded"; disputes: Dispute[] }
  | { status: "error"; error: unknown };

export function OrganizationDisputes() {
  const router = useRouter();
  const [state, setState] = React.useState<State>({ status: "loading" });
  const [requestAttempt, setRequestAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();

    getOrganizationDisputes(controller.signal)
      .then((disputes) => {
        setState({ status: "loaded", disputes });
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

  function handleUpdated(updatedDispute: Dispute) {
    setState((currentState) =>
      currentState.status === "loaded"
        ? {
            ...currentState,
            disputes: currentState.disputes.map((dispute) =>
              dispute.id === updatedDispute.id ? updatedDispute : dispute,
            ),
          }
        : currentState,
    );
  }

  if (state.status === "loading") {
    return <OrganizationDisputesSkeleton />;
  }

  if (state.status === "error") {
    return (
      <RequestErrorCard
        error={state.error}
        subject="Organization disputes"
        onRetry={() => {
          setState({ status: "loading" });
          setRequestAttempt((attempt) => attempt + 1);
        }}
      />
    );
  }

  if (state.disputes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <GavelIcon className="mb-2 size-6 text-clay" />
          <CardTitle>No disputes to review</CardTitle>
          <CardDescription>
            Disputes opened against resources you administer will appear
            here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="border border-line">
      {state.disputes.map((dispute) => (
        <div
          key={dispute.id}
          className="grid gap-3 border-b border-line p-4 last:border-b-0 md:grid-cols-[1fr_auto] md:items-center"
        >
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">
                {formatDisputeReason(dispute.reason)}
              </p>
              <DisputeStatusBadge status={dispute.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {dispute.description}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Opened {formatOrganizationDate(dispute.createdAt)} · Booking{" "}
              <code>{dispute.bookingId}</code>
            </p>
          </div>
          <ReviewDisputeDialog dispute={dispute} onUpdated={handleUpdated} />
        </div>
      ))}
    </div>
  );
}

function OrganizationDisputesSkeleton() {
  return (
    <div
      aria-label="Loading organization disputes"
      aria-busy="true"
      className="grid gap-4"
    >
      <Skeleton className="h-24 w-full rounded-none" />
      <Skeleton className="h-24 w-full rounded-none" />
    </div>
  );
}
