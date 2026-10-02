"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, GavelIcon, MailIcon } from "lucide-react";

import { DisputeStatusBadge } from "@/components/dispute-status-badge";
import { DisputeResourceDetails } from "@/components/dispute-resource-details";
import { RequestErrorCard } from "@/components/request-error-card";
import { ReviewDisputeDialog } from "@/components/review-dispute-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiAuthenticationError } from "@/lib/api-client";
import {
  getOrganizationDisputes,
  updateDispute,
} from "@/lib/booking-service/dispute-api";
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
  const [acknowledging, setAcknowledging] = React.useState<string | null>(null);
  const [acknowledged, setAcknowledged] = React.useState(false);
  const [acknowledgementError, setAcknowledgementError] = React.useState("");

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

  async function acknowledge(dispute: Dispute) {
    if (acknowledging) return;
    setAcknowledging(dispute.id);
    setAcknowledgementError("");
    setAcknowledged(false);
    try {
      handleUpdated(await updateDispute(dispute.id, { status: "UNDER_REVIEW" }));
      setAcknowledged(true);
    } catch (error) {
      if (error instanceof ApiAuthenticationError) {
        router.replace("/login");
        router.refresh();
        return;
      }
      setAcknowledgementError(
        error instanceof Error ? error.message : "Unable to acknowledge this dispute.",
      );
    } finally {
      setAcknowledging(null);
    }
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
      {acknowledged ? (
        <p className="border-b border-line p-3 text-sm" role="status">
          Dispute acknowledged and moved to under review.
        </p>
      ) : null}
      {acknowledgementError ? (
        <p className="border-b border-line p-3 text-sm text-destructive" role="alert">
          {acknowledgementError}
        </p>
      ) : null}
      {state.disputes.map((dispute) => (
        <div
          key={dispute.id}
          className="grid gap-3 border-b border-line p-4 last:border-b-0 md:grid-cols-[1fr_auto] md:items-center"
        >
          <div>
            <DisputeResourceDetails dispute={dispute} />
            <div className="flex flex-wrap items-center gap-2">
              <p className="mt-2 font-medium">
                {formatDisputeReason(dispute.reason)}
              </p>
              <DisputeStatusBadge status={dispute.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {dispute.description}
            </p>
            {dispute.resolutionNotes ? (
              <p className="mt-2 border-l-2 border-line pl-3 text-sm">
                <span className="font-medium">Review notes: </span>
                {dispute.resolutionNotes}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">
              Submitted {formatOrganizationDate(dispute.createdAt)}
            </p>
            {dispute.submittedByUser ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Submitted by {dispute.submittedByUser.firstName}{" "}
                {dispute.submittedByUser.lastName}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            {dispute.submittedByUser ? (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={
                  <a href={`mailto:${dispute.submittedByUser.email}`} />
                }
              >
                <MailIcon data-icon="inline-start" />
                Contact
              </Button>
            ) : null}
            {dispute.status === "OPEN" ? (
              <Button
                variant="outline"
                size="sm"
                disabled={acknowledging !== null}
                onClick={() => void acknowledge(dispute)}
              >
                <CheckIcon data-icon="inline-start" />
                {acknowledging === dispute.id ? "Acknowledging…" : "Acknowledge"}
              </Button>
            ) : null}
            <ReviewDisputeDialog dispute={dispute} onUpdated={handleUpdated} />
          </div>
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
