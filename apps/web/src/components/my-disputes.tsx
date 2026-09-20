"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FlagIcon } from "lucide-react";

import { DisputeStatusBadge } from "@/components/dispute-status-badge";
import { OpenDisputeDialog } from "@/components/open-dispute-dialog";
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
import { getMyBookings } from "@/lib/booking-service/booking-api";
import { getMyDisputes } from "@/lib/booking-service/dispute-api";
import type { Dispute, UserBooking } from "@/lib/booking-service/types";
import { formatOrganizationDate } from "@/lib/resource-service/organization-format";

type State =
  | { status: "loading" }
  | { status: "loaded"; bookings: UserBooking[]; disputes: Dispute[] }
  | { status: "error"; error: unknown };

export function MyDisputes() {
  const router = useRouter();
  const [state, setState] = React.useState<State>({ status: "loading" });
  const [requestAttempt, setRequestAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      getMyBookings(controller.signal),
      getMyDisputes(controller.signal),
    ])
      .then(([bookings, disputes]) => {
        setState({ status: "loaded", bookings, disputes });
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

  function handleOpened(dispute: Dispute) {
    setState((currentState) =>
      currentState.status === "loaded"
        ? { ...currentState, disputes: [dispute, ...currentState.disputes] }
        : currentState,
    );
  }

  if (state.status === "loading") {
    return <MyDisputesSkeleton />;
  }

  if (state.status === "error") {
    return (
      <RequestErrorCard
        error={state.error}
        subject="Disputes"
        onRetry={() => {
          setState({ status: "loading" });
          setRequestAttempt((attempt) => attempt + 1);
        }}
      />
    );
  }

  const disputedBookingIds = new Set(
    state.disputes.map((dispute) => dispute.bookingId),
  );
  const eligibleBookings = state.bookings.filter(
    (booking) =>
      booking.status.toUpperCase() === "COMPLETED" &&
      !disputedBookingIds.has(booking.id),
  );

  return (
    <div className="grid gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Report an issue with a completed booking</CardTitle>
          <CardDescription>
            If a resource was not returned, was damaged, or was misplaced,
            open a dispute so the resource&apos;s administrators can review
            it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {eligibleBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No completed bookings are currently eligible for a dispute.
            </p>
          ) : (
            <div className="border border-line">
              {eligibleBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 last:border-b-0"
                >
                  <div>
                    <p className="font-medium">
                      {booking.resourceSlot.resource.name}
                    </p>
                    <code className="mt-1 block text-xs text-muted-foreground">
                      {booking.id}
                    </code>
                  </div>
                  <OpenDisputeDialog booking={booking} onOpened={handleOpened} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {state.disputes.length === 0 ? (
        <Card>
          <CardHeader>
            <FlagIcon className="mb-2 size-6 text-clay" />
            <CardTitle>No disputes submitted</CardTitle>
            <CardDescription>
              Disputes you open will appear here with their review status.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div>
          <p className="eyebrow text-clay">Submitted disputes</p>
          <h3 className="mt-2 mb-4 font-heading text-3xl leading-none">
            Your disputes
          </h3>
          <div className="border border-line">
            {state.disputes.map((dispute) => (
              <div
                key={dispute.id}
                className="grid gap-2 border-b border-line p-4 last:border-b-0 md:grid-cols-[1fr_auto] md:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">
                      {reasonLabel(dispute.reason)}
                    </p>
                    <DisputeStatusBadge status={dispute.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {dispute.description}
                  </p>
                  {dispute.resolutionNotes ? (
                    <p className="mt-2 border-l-2 border-line pl-3 text-sm">
                      <span className="font-medium">Resolution: </span>
                      {dispute.resolutionNotes}
                    </p>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground md:text-right">
                  Opened {formatOrganizationDate(dispute.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function reasonLabel(reason: Dispute["reason"]): string {
  switch (reason) {
    case "NOT_RETURNED":
      return "Resource was not returned";
    case "DAMAGED":
      return "Resource was damaged";
    case "MISPLACED":
      return "Resource was misplaced";
    default:
      return "Other issue";
  }
}

function MyDisputesSkeleton() {
  return (
    <div aria-label="Loading disputes" aria-busy="true" className="grid gap-4">
      <Skeleton className="h-32 w-full rounded-none" />
      <Skeleton className="h-32 w-full rounded-none" />
    </div>
  );
}
