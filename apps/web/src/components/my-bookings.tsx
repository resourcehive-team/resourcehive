"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CalendarPlusIcon,
  Clock3Icon,
  SearchIcon,
} from "lucide-react";

import { BookingConfirmation } from "@/components/booking-confirmation";
import {
  CopyBookingReferenceButton,
  DownloadBookingReceiptButton,
} from "@/components/booking-reference-actions";
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
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AuthenticationRequiredError,
  getCurrentUser,
} from "@/lib/auth-api";
import { ApiAuthenticationError } from "@/lib/api-client";
import { getMyBookings } from "@/lib/booking-service/booking-api";
import type {
  CreatedBooking,
  UserBooking,
} from "@/lib/booking-service/types";

type BookingsState =
  | { status: "loading" }
  | {
      status: "loaded";
      bookings: UserBooking[];
      organizationId: string | null;
    }
  | { status: "error"; error: unknown };

type BookingTiming =
  | "upcoming"
  | "in-progress"
  | "past"
  | "completed"
  | "cancelled";

export function MyBookings() {
  const router = useRouter();
  const [state, setState] = React.useState<BookingsState>({
    status: "loading",
  });
  const [search, setSearch] = React.useState("");
  const [requestAttempt, setRequestAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      getMyBookings(controller.signal),
      getCurrentUser(controller.signal),
    ])
      .then(([bookings, currentUser]) => {
        setState({
          status: "loaded",
          bookings,
          organizationId: currentUser.organizationContext.organizationId,
        });
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setState({ status: "error", error: requestError });

        if (
          requestError instanceof ApiAuthenticationError ||
          requestError instanceof AuthenticationRequiredError
        ) {
          router.replace("/login");
          router.refresh();
        }
      });

    return () => controller.abort();
  }, [requestAttempt, router]);

  const bookings = state.status === "loaded" ? state.bookings : [];
  const visibleBookings = filterAndSortBookings(bookings, search);

  return (
    <div className="grid gap-8">
      <BookingMetrics bookings={bookings} loading={state.status !== "loaded"} />

      {state.status === "loading" ? <BookingListSkeleton /> : null}

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
        <section className="grid gap-4" aria-labelledby="booking-list-title">
          <BookingSearch value={search} onChange={setSearch} />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow text-clay">Reservation records</p>
              <h3
                id="booking-list-title"
                className="mt-2 font-heading text-3xl leading-none"
              >
                Your booking history
              </h3>
            </div>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {visibleBookings.length} of {state.bookings.length} bookings
            </p>
          </div>

          {visibleBookings.length > 0 ? (
            <div className="border border-line">
              {visibleBookings.map((booking) => (
                <BookingRow
                  key={booking.id}
                  booking={booking}
                  organizationId={state.organizationId}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No matching bookings</CardTitle>
                <CardDescription>
                  Search with another resource name or booking reference.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </section>
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

function BookingSearch({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Search bookings</CardTitle>
        <CardDescription>
          Filter your records by resource name or booking reference.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Label htmlFor="booking-search">Resource or reference</Label>
        <div className="relative mt-2">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="booking-search"
            className="pl-9"
            type="search"
            value={value}
            placeholder="Search bookings"
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function BookingRow({
  booking,
  organizationId,
}: {
  booking: UserBooking;
  organizationId: string | null;
}) {
  const receiptBooking = toCreatedBooking(booking);
  const timing = getBookingTiming(booking, Date.now());
  const resourceHref = createResourceHref(
    booking.resourceSlot.resource.id,
    organizationId,
  );

  return (
    <Dialog>
      <article className="group relative grid gap-4 border-b border-line bg-paper p-4 transition-colors last:border-b-0 hover:bg-muted focus-within:bg-muted md:grid-cols-[minmax(0,1.5fr)_minmax(12rem,1fr)_auto] md:items-center md:p-5">
        <DialogTrigger
          render={
            <button
              type="button"
              className="absolute inset-0 z-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
              aria-label={`View booking summary for ${booking.resourceSlot.resource.name}`}
            />
          }
        />

        <div className="pointer-events-none relative z-10 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate font-medium">
              {booking.resourceSlot.resource.name}
            </h4>
            <BookingStatusBadge timing={timing} />
          </div>
          <code className="mt-2 block truncate font-mono text-xs text-muted-foreground">
            {booking.id}
          </code>
        </div>

        <div className="pointer-events-none relative z-10 grid gap-1 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <CalendarDaysIcon className="size-4 text-clay" />
            {formatBookingDate(booking.resourceSlot.startsAt)}
          </p>
          <p className="flex items-center gap-2 text-muted-foreground">
            <Clock3Icon className="size-4" />
            {formatBookingTimeRange(
              booking.resourceSlot.startsAt,
              booking.resourceSlot.endsAt,
            )}
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap gap-2 md:justify-end">
          <Link
            className={buttonVariants({ variant: "outline", size: "sm" })}
            href={resourceHref}
          >
            View resource
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
          <CopyBookingReferenceButton referenceId={booking.id} />
          <DownloadBookingReceiptButton booking={receiptBooking} />
        </div>
      </article>
      <DialogContent className="rounded-none sm:max-w-xl">
        <BookingConfirmation booking={receiptBooking} mode="summary" />
      </DialogContent>
    </Dialog>
  );
}

function BookingStatusBadge({ timing }: { timing: BookingTiming }) {
  if (timing === "cancelled") {
    return <Badge variant="outline">Cancelled</Badge>;
  }

  if (timing === "completed") {
    return <Badge variant="success">Completed</Badge>;
  }

  if (timing === "past") {
    return <Badge variant="secondary">Past</Badge>;
  }

  if (timing === "in-progress") {
    return <Badge variant="warning">In progress</Badge>;
  }

  return <Badge>Upcoming</Badge>;
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

function BookingListSkeleton() {
  return (
    <div aria-label="Loading bookings" aria-busy="true" className="grid gap-4">
      <Skeleton className="h-36 w-full rounded-none" />
      <div className="border border-line">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="grid gap-4 border-b border-line p-5 last:border-b-0 md:grid-cols-3"
          >
            <Skeleton className="h-10 w-full rounded-none" />
            <Skeleton className="h-10 w-full rounded-none" />
            <Skeleton className="h-10 w-full rounded-none" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading your bookings.</span>
    </div>
  );
}

function filterAndSortBookings(
  bookings: UserBooking[],
  search: string,
): UserBooking[] {
  const query = search.trim().toLocaleLowerCase();
  const now = Date.now();

  return bookings
    .filter((booking) => {
      if (!query) {
        return true;
      }

      return (
        booking.id.toLocaleLowerCase().includes(query) ||
        booking.resourceSlot.resource.name.toLocaleLowerCase().includes(query)
      );
    })
    .sort((left, right) => {
      const leftStartsAt = new Date(left.resourceSlot.startsAt).getTime();
      const rightStartsAt = new Date(right.resourceSlot.startsAt).getTime();
      const leftIsPast = new Date(left.resourceSlot.endsAt).getTime() < now;
      const rightIsPast = new Date(right.resourceSlot.endsAt).getTime() < now;

      if (leftIsPast !== rightIsPast) {
        return leftIsPast ? 1 : -1;
      }

      return leftIsPast
        ? rightStartsAt - leftStartsAt
        : leftStartsAt - rightStartsAt;
    });
}

function getBookingTiming(booking: UserBooking, now: number): BookingTiming {
  const status = booking.status.toUpperCase();
  const startsAt = new Date(booking.resourceSlot.startsAt).getTime();
  const endsAt = new Date(booking.resourceSlot.endsAt).getTime();

  if (status === "CANCELLED") {
    return "cancelled";
  }

  if (status === "COMPLETED") {
    return "completed";
  }

  if (Number.isFinite(endsAt) && endsAt < now) {
    return "past";
  }

  if (Number.isFinite(startsAt) && startsAt <= now) {
    return "in-progress";
  }

  return "upcoming";
}

function toCreatedBooking(booking: UserBooking): CreatedBooking {
  return {
    id: booking.id,
    resourceSlotId: booking.resourceSlotId,
    resourceId: booking.resourceSlot.resource.id,
    resourceName: booking.resourceSlot.resource.name,
    userId: booking.userId,
    status: booking.status,
    startsAt: booking.resourceSlot.startsAt,
    endsAt: booking.resourceSlot.endsAt,
    pointsDeducted: Math.max(0, booking.resourceSlot.resource.pointCost),
    createdAt: booking.createdAt,
  };
}

function createResourceHref(
  resourceId: string,
  organizationId: string | null,
): string {
  const basePath = `/dashboard/resources/${encodeURIComponent(resourceId)}`;

  if (!organizationId) {
    return basePath;
  }

  return `${basePath}?organization=${encodeURIComponent(organizationId)}`;
}

function formatBookingDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatBookingTimeRange(startsAt: string, endsAt: string): string {
  return `${formatBookingTime(startsAt)}–${formatBookingTime(endsAt)}`;
}

function formatBookingTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
