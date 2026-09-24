"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { BookingHistory, BookingHistorySkeleton } from "@/components/booking-history";
import { RequestErrorCard } from "@/components/request-error-card";
import { ApiAuthenticationError } from "@/lib/api-client";
import { getOrganizationBookings } from "@/lib/booking-service/booking-api";
import type { OrganizationBooking } from "@/lib/booking-service/types";

type State =
  | { status: "loading" }
  | { status: "loaded"; bookings: OrganizationBooking[] }
  | { status: "error"; error: unknown };

export function OrganizationBookings() {
  const router = useRouter();
  const [state, setState] = React.useState<State>({ status: "loading" });
  const [requestAttempt, setRequestAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();

    getOrganizationBookings(controller.signal)
      .then((bookings) => {
        setState({ status: "loaded", bookings });
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

  const handleBookingUpdated = React.useCallback(
    (updatedBooking: OrganizationBooking) => {
      setState((currentState) => {
        if (currentState.status !== "loaded") {
          return currentState;
        }

        return {
          status: "loaded",
          bookings: currentState.bookings.map((booking) =>
            booking.id === updatedBooking.id ? updatedBooking : booking,
          ),
        };
      });
    },
    [],
  );

  if (state.status === "loading") {
    return <BookingHistorySkeleton />;
  }

  if (state.status === "error") {
    return (
      <RequestErrorCard
        error={state.error}
        subject="Bookings to review"
        onRetry={() => {
          setState({ status: "loading" });
          setRequestAttempt((attempt) => attempt + 1);
        }}
      />
    );
  }

  return (
    <BookingHistory
      bookings={state.bookings}
      mode="resource-admin"
      onBookingUpdated={handleBookingUpdated}
    />
  );
}
