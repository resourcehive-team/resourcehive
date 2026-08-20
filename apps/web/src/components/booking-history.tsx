"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  MailIcon,
  SearchIcon,
  UserRoundIcon,
} from "lucide-react";

import { BookingConfirmation } from "@/components/booking-confirmation";
import { BookingCancellationDialog } from "@/components/booking-cancellation-dialog";
import {
  CopyBookingReferenceButton,
  DownloadBookingReceiptButton,
} from "@/components/booking-reference-actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiAuthenticationError } from "@/lib/api-client";
import { completeOrganizationBooking } from "@/lib/booking-service/booking-api";
import type {
  BookingMember,
  CreatedBooking,
  OrganizationBooking,
  UserBooking,
} from "@/lib/booking-service/types";
import { formatOrganizationLabel } from "@/lib/resource-service/organization-format";

type BookingHistoryMode = "personal" | "resource-admin";

type HistoryBooking = UserBooking & {
  user?: BookingMember | null;
};

type BookingTiming =
  "upcoming" | "in-progress" | "past" | "completed" | "cancelled";

export function BookingHistory({
  bookings,
  mode,
  onBookingUpdated,
  resourceOrganizationIds = {},
}: {
  bookings: HistoryBooking[];
  mode: BookingHistoryMode;
  onBookingUpdated?: (booking: OrganizationBooking) => void;
  resourceOrganizationIds?: Record<string, string>;
}) {
  const [search, setSearch] = React.useState("");
  const searchId = React.useId();
  const titleId = React.useId();
  const visibleBookings = filterAndSortBookings(bookings, search, mode);
  const isAdminView = mode === "resource-admin";

  if (bookings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No bookings yet</CardTitle>
          <CardDescription>
            {isAdminView
              ? "No bookings have been made for this resource."
              : "No reservations have been made through this account."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <section className="grid gap-4" aria-labelledby={titleId}>
      <Card>
        <CardHeader>
          <CardTitle>Search bookings</CardTitle>
          <CardDescription>
            {isAdminView
              ? "Filter this resource's reservations by member, email, or booking reference."
              : "Filter your records by resource name or booking reference."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor={searchId}>
            {isAdminView
              ? "Member, email, or reference"
              : "Resource or reference"}
          </Label>
          <div className="relative mt-2">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={searchId}
              className="pl-9"
              type="search"
              value={search}
              placeholder="Search bookings"
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-clay">
            {isAdminView ? "Resource reservations" : "Reservation records"}
          </p>
          <h3 id={titleId} className="mt-2 font-heading text-3xl leading-none">
            {isAdminView ? "Booking history" : "Your booking history"}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {visibleBookings.length} of {bookings.length} bookings
        </p>
      </div>

      {visibleBookings.length > 0 ? (
        <div className="border border-line">
          {visibleBookings.map((booking) => (
            <BookingRow
              key={booking.id}
              booking={booking}
              mode={mode}
              onBookingUpdated={onBookingUpdated}
              organizationId={
                resourceOrganizationIds[booking.resourceSlot.resource.id] ??
                null
              }
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No matching bookings</CardTitle>
            <CardDescription>
              Search with another resource name, member, email, or booking
              reference.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </section>
  );
}

function BookingRow({
  booking,
  mode,
  onBookingUpdated,
  organizationId,
}: {
  booking: HistoryBooking;
  mode: BookingHistoryMode;
  onBookingUpdated?: (booking: OrganizationBooking) => void;
  organizationId: string | null;
}) {
  const receiptBooking = toCreatedBooking(booking);
  const [now] = React.useState(Date.now);
  const timing = getBookingTiming(booking, now);
  const isAdminView = mode === "resource-admin";
  const resourceHref = createResourceHref(
    booking.resourceSlot.resource.id,
    organizationId,
  );
  const member = isBookingMember(booking.user) ? booking.user : null;
  const summarySubject = member
    ? formatMemberName(member)
    : booking.resourceSlot.resource.name;

  return (
    <Dialog>
      <article className="group relative grid gap-4 border-b border-line bg-paper p-4 transition-colors last:border-b-0 hover:bg-muted focus-within:bg-muted md:grid-cols-[minmax(0,1.5fr)_minmax(12rem,1fr)_auto] md:items-center md:p-5">
        <DialogTrigger
          render={
            <button
              type="button"
              className="absolute inset-0 z-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
              aria-label={`View booking summary for ${summarySubject}`}
            />
          }
        />

        <div className="pointer-events-none relative z-10 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {isAdminView ? (
              member ? (
                <MemberDetailsDialog member={member} />
              ) : (
                <h4 className="font-medium text-muted-foreground">
                  Member details unavailable
                </h4>
              )
            ) : (
              <h4 className="truncate font-medium">
                {booking.resourceSlot.resource.name}
              </h4>
            )}
            <BookingStatusBadge timing={timing} />
          </div>
          {isAdminView ? (
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {booking.resourceSlot.resource.name}
            </p>
          ) : null}
          <code className="mt-2 block truncate font-mono text-xs text-muted-foreground">
            {booking.id}
          </code>
        </div>

        <div className="pointer-events-none relative z-10 grid gap-1 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <CalendarDaysIcon className="size-4 text-clay" />
            {formatBookingSchedule(
              booking.resourceSlot.startsAt,
              booking.resourceSlot.endsAt,
            )}
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap gap-2 md:justify-end">
          {!isAdminView && resourceHref ? (
            <Link
              className={buttonVariants({ variant: "outline", size: "sm" })}
              href={resourceHref}
            >
              View resource
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          ) : null}
          <CopyBookingReferenceButton referenceId={booking.id} />
          {!isAdminView ? (
            <DownloadBookingReceiptButton booking={receiptBooking} />
          ) : null}
          <BookingMutationActions
            booking={booking}
            canUserCancel={timing === "upcoming"}
            isAdmin={isAdminView}
            onBookingUpdated={onBookingUpdated}
          />
        </div>
      </article>
      <DialogContent className="rounded-none sm:max-w-xl">
        <BookingConfirmation
          actions={
            <BookingMutationActions
              booking={booking}
              canUserCancel={timing === "upcoming"}
              isAdmin={isAdminView}
              onBookingUpdated={onBookingUpdated}
            />
          }
          booking={receiptBooking}
          mode="summary"
          showReceipt={!isAdminView}
        />
      </DialogContent>
    </Dialog>
  );
}

function BookingMutationActions({
  booking,
  canUserCancel,
  isAdmin,
  onBookingUpdated,
}: {
  booking: HistoryBooking;
  canUserCancel: boolean;
  isAdmin: boolean;
  onBookingUpdated?: (booking: OrganizationBooking) => void;
}) {
  if (booking.status.toUpperCase() !== "CONFIRMED" || !onBookingUpdated) {
    return null;
  }

  return (
    <>
      {isAdmin ? (
        <MarkBookingCompleteButton
          bookingId={booking.id}
          onCompleted={onBookingUpdated}
        />
      ) : null}
      {isAdmin || canUserCancel ? (
        <BookingCancellationDialog
          booking={booking}
          isAdmin={isAdmin}
          onCancelled={onBookingUpdated}
        />
      ) : null}
    </>
  );
}

function MarkBookingCompleteButton({
  bookingId,
  onCompleted,
}: {
  bookingId: string;
  onCompleted: (booking: OrganizationBooking) => void;
}) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  async function markAsComplete() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const completedBooking = await completeOrganizationBooking(bookingId);
      onCompleted(completedBooking);
    } catch (requestError) {
      if (requestError instanceof ApiAuthenticationError) {
        window.location.assign("/login");
        return;
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : "The booking could not be marked as completed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        disabled={isSubmitting}
        onClick={markAsComplete}
      >
        <CheckCircle2Icon data-icon="inline-start" />
        {isSubmitting ? "Marking complete..." : "Mark as complete"}
      </Button>
      {error ? (
        <span
          className="max-w-64 text-right text-xs text-destructive"
          role="alert"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}

function MemberDetailsDialog({ member }: { member: BookingMember }) {
  const memberName = formatMemberName(member);

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="link"
            size="sm"
            className="pointer-events-auto h-auto justify-start px-0 text-left font-medium"
          />
        }
      >
        {memberName}
      </DialogTrigger>
      <DialogContent className="rounded-none sm:max-w-xl">
        <DialogHeader>
          <UserRoundIcon className="size-6 text-clay" />
          <p className="eyebrow text-clay">Booking member</p>
          <DialogTitle className="text-3xl font-normal leading-none">
            {memberName}
          </DialogTitle>
          <DialogDescription>
            Account and contact information for the member who made this
            reservation.
          </DialogDescription>
        </DialogHeader>
        <dl className="grid border border-line text-sm sm:grid-cols-2">
          <MemberDetail
            className="border-b border-line sm:col-span-2"
            label="Email"
          >
            <a
              className="inline-flex items-center gap-2 underline decoration-line underline-offset-4 hover:text-clay hover:decoration-clay"
              href={`mailto:${member.email}`}
            >
              <MailIcon className="size-4" />
              {member.email}
            </a>
          </MemberDetail>
          <MemberDetail
            className="border-b border-line sm:border-r sm:border-b-0"
            label="Account status"
          >
            <Badge variant={accountStatusVariant(member.status)}>
              {formatOrganizationLabel(member.status)}
            </Badge>
          </MemberDetail>
          <MemberDetail label="Email verification">
            <Badge variant={member.emailVerifiedAt ? "success" : "warning"}>
              {member.emailVerifiedAt ? "Verified" : "Not verified"}
            </Badge>
          </MemberDetail>
          <MemberDetail
            className="border-t border-line sm:col-span-2"
            label="Account created"
          >
            {formatBookingDateTime(member.createdAt)}
          </MemberDetail>
        </dl>
        <DialogFooter>
          <DialogClose render={<Button />}>Done</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MemberDetail({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div className={`p-4 ${className ?? ""}`}>
      <dt className="eyebrow text-muted-foreground">{label}</dt>
      <dd className="mt-2 font-medium">{children}</dd>
    </div>
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

export function BookingHistorySkeleton() {
  return (
    <div
      aria-label="Loading booking history"
      aria-busy="true"
      className="grid gap-4"
    >
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
      <span className="sr-only">Loading bookings.</span>
    </div>
  );
}

function filterAndSortBookings(
  bookings: HistoryBooking[],
  search: string,
  mode: BookingHistoryMode,
): HistoryBooking[] {
  const query = search.trim().toLocaleLowerCase();
  const now = Date.now();

  return bookings
    .filter((booking) => {
      if (!query) {
        return true;
      }

      const member = isBookingMember(booking.user) ? booking.user : null;
      const memberSearch = member
        ? `${formatMemberName(member)} ${member.email}`.toLocaleLowerCase()
        : "";

      return (
        booking.id.toLocaleLowerCase().includes(query) ||
        booking.resourceSlot.resource.name
          .toLocaleLowerCase()
          .includes(query) ||
        (mode === "resource-admin" && memberSearch.includes(query))
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

export function getBookingTiming(
  booking: UserBooking,
  now: number,
): BookingTiming {
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
): string | null {
  if (!organizationId) {
    return null;
  }

  return `/dashboard/resources/${encodeURIComponent(resourceId)}?organization=${encodeURIComponent(organizationId)}`;
}

function isBookingMember(member: unknown): member is BookingMember {
  if (!member || typeof member !== "object") {
    return false;
  }

  const candidate = member as Partial<BookingMember>;

  return (
    typeof candidate.firstName === "string" &&
    typeof candidate.lastName === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.status === "string" &&
    typeof candidate.createdAt === "string"
  );
}

function formatMemberName(member: BookingMember): string {
  const name = `${member.firstName} ${member.lastName}`.trim();
  return name || member.email;
}

function accountStatusVariant(
  status: string,
): "default" | "destructive" | "outline" {
  if (status.toUpperCase() === "ACTIVE") {
    return "default";
  }

  if (status.toUpperCase() === "SUSPENDED") {
    return "destructive";
  }

  return "outline";
}

function formatBookingSchedule(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Unknown schedule";
  }

  return isSameCalendarDate(start, end)
    ? `${formatBookingDate(start)} · ${formatBookingTime(start)}–${formatBookingTime(end)}`
    : `${formatBookingDate(start)}, ${formatBookingTime(start)} → ${formatBookingDate(end)}, ${formatBookingTime(end)}`;
}

function formatBookingDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function isSameCalendarDate(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function formatBookingTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatBookingDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
