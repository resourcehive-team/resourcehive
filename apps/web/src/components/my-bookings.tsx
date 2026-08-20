"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, CalendarPlusIcon } from "lucide-react";

import {
  BookingHistory,
  BookingHistorySkeleton,
  getBookingTiming,
} from "@/components/booking-history";
import { PointsBalanceCard } from "@/components/points-balance-card";
import { RequestErrorCard } from "@/components/request-error-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiAuthenticationError, ApiError } from "@/lib/api-client";
import { getMyBookings } from "@/lib/booking-service/booking-api";
import type { UserBooking } from "@/lib/booking-service/types";
import { getCurrentUserMemberships } from "@/lib/resource-service/membership-api";
import { getResourceDetails } from "@/lib/resource-service/resource-api";

type BookingsState =
  | { status: "loading" }
  | {
      status: "loaded";
      bookings: UserBooking[];
      resourceOrganizationIds: Record<string, string>;
    }
  | { status: "error"; error: unknown };

export function MyBookings() {
  const router = useRouter();
  const [state, setState] = React.useState<BookingsState>({
    status: "loading",
  });
  const [requestAttempt, setRequestAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      getMyBookings(controller.signal),
      getCurrentUserMemberships(controller.signal),
    ])
      .then(async ([bookings, memberships]) => {
        const resourceOrganizationIds = await resolveResourceOrganizations(
          bookings,
          memberships
            .filter(
              (membership) => membership.status.toUpperCase() === "APPROVED",
            )
            .map((membership) => membership.organizationId),
          controller.signal,
        );

        if (controller.signal.aborted) {
          return;
        }

        setState({
          status: "loaded",
          bookings,
          resourceOrganizationIds,
        });
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

  const bookings = state.status === "loaded" ? state.bookings : [];

  return (
    <div className="grid gap-8">
      <BookingMetrics bookings={bookings} loading={state.status !== "loaded"} />

      {state.status === "loading" ? <BookingHistorySkeleton /> : null}

      {state.status === "error" ? (
        <RequestErrorCard
          error={state.error}
          subject="Bookings"
          onRetry={() => {
            setState({ status: "loading" });
            setRequestAttempt((attempt) => attempt + 1);
          }}
        />
      ) : null}

      {state.status === "loaded" && state.bookings.length === 0 ? (
        <EmptyBookings />
      ) : null}

      {state.status === "loaded" && state.bookings.length > 0 ? (
        <BookingHistory
          bookings={state.bookings}
          mode="personal"
          resourceOrganizationIds={state.resourceOrganizationIds}
        />
      ) : null}
    </div>
  );
}

function BookingMetrics({
  bookings,
  loading,
}: {
  bookings: UserBooking[];
  loading: boolean;
}) {
  const now = Date.now();
  const active = bookings.filter((booking) => {
    const timing = getBookingTiming(booking, now);
    return timing === "upcoming" || timing === "in-progress";
  }).length;
  const past = bookings.filter((booking) => {
    const endsAt = new Date(booking.resourceSlot.endsAt).getTime();
    return Number.isFinite(endsAt) && endsAt < now;
  }).length;

  return (
    <div className="shared-panel-grid grid-cols-1 *:data-[slot=card]:border-0 sm:grid-cols-2 xl:grid-cols-4">
      <BookingMetric
        label="Total bookings"
        value={loading ? null : bookings.length}
        badge="All records"
        description="Every reservation made through your account."
      />
      <BookingMetric
        label="Active and upcoming"
        value={loading ? null : active}
        badge={active === 1 ? "1 reservation" : `${active} reservations`}
        description="Confirmed bookings that have not ended yet."
      />
      <BookingMetric
        label="Past bookings"
        value={loading ? null : past}
        badge={past === 1 ? "1 record" : `${past} records`}
        description="Reservations whose published time has passed."
      />
      <PointsBalanceCard />
    </div>
  );
}

function BookingMetric({
  badge,
  description,
  label,
  value,
}: {
  badge: string;
  description: string;
  label: string;
  value: number | null;
}) {
  return (
    <Card aria-busy={value === null}>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl font-medium tabular-nums">
          {value === null ? "—" : new Intl.NumberFormat().format(value)}
        </CardTitle>
        <CardAction>
          <Badge variant="outline">{value === null ? "Loading" : badge}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function EmptyBookings() {
  return (
    <Card>
      <CardHeader>
        <CalendarPlusIcon className="mb-2 size-6 text-clay" />
        <CardTitle>No bookings yet</CardTitle>
        <CardDescription>
          Browse the resource catalogue and choose an available published slot.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link className={buttonVariants()} href="/dashboard/resources">
          Browse resources
          <ArrowRightIcon data-icon="inline-end" />
        </Link>
      </CardContent>
    </Card>
  );
}

async function resolveResourceOrganizations(
  bookings: UserBooking[],
  organizationIds: string[],
  signal: AbortSignal,
): Promise<Record<string, string>> {
  const resourceIds = [
    ...new Set(bookings.map((booking) => booking.resourceSlot.resource.id)),
  ];
  const resolvedResources = await Promise.all(
    resourceIds.map(async (resourceId) => {
      for (const organizationId of organizationIds) {
        try {
          await getResourceDetails(organizationId, resourceId, signal);
          return { organizationId, resourceId };
        } catch (requestError) {
          if (
            requestError instanceof ApiError &&
            (requestError.status === 403 || requestError.status === 404)
          ) {
            continue;
          }

          throw requestError;
        }
      }

      return null;
    }),
  );

  return Object.fromEntries(
    resolvedResources
      .filter((resource) => resource !== null)
      .map((resource) => [resource.resourceId, resource.organizationId]),
  );
}
