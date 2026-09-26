"use client";

import * as React from "react";
import { FlagIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiAuthenticationError } from "@/lib/api-client";
import { getMyBookings } from "@/lib/booking-service/booking-api";
import { openDispute } from "@/lib/booking-service/dispute-api";
import type {
  Dispute,
  DisputeReason,
  UserBooking,
} from "@/lib/booking-service/types";

type BookingOptionsState =
  | { status: "loading" }
  | { status: "loaded"; bookings: UserBooking[] }
  | { status: "error" };

const reasonLabels: Record<DisputeReason, string> = {
  UNAVAILABLE: "Resource was unavailable",
  BROKEN: "Resource was broken",
  NOT_AS_DESCRIBED: "Resource didn't match the description",
  OTHER: "Other issue",
};

export function OpenDisputeDialog({
  onOpened,
}: {
  onOpened: (dispute: Dispute) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [bookingId, setBookingId] = React.useState("");
  const [reason, setReason] = React.useState<DisputeReason>("UNAVAILABLE");
  const [description, setDescription] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [bookingOptions, setBookingOptions] =
    React.useState<BookingOptionsState>({ status: "loading" });

  function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      setBookingId("");
      setReason("UNAVAILABLE");
      setDescription("");
      setError("");
      setBookingOptions({ status: "loading" });
    }
  }

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const controller = new AbortController();

    getMyBookings(controller.signal)
      .then((bookings) => {
        if (controller.signal.aborted) {
          return;
        }

        setBookingOptions({
          status: "loaded",
          bookings: bookings.filter(
            (booking) => booking.status.toUpperCase() === "COMPLETED",
          ),
        });
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        if (requestError instanceof ApiAuthenticationError) {
          window.location.assign("/login");
          return;
        }

        setBookingOptions({ status: "error" });
      });

    return () => controller.abort();
  }, [open]);

  async function submitDispute(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const dispute = await openDispute({ bookingId, reason, description });
      onOpened(dispute);
      setOpen(false);
    } catch (requestError) {
      if (requestError instanceof ApiAuthenticationError) {
        window.location.assign("/login");
        return;
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : "The dispute could not be submitted.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const bookingLabels: Record<string, string> =
    bookingOptions.status === "loaded"
      ? Object.fromEntries(
          bookingOptions.bookings.map((booking) => [
            booking.id,
            formatBookingOptionLabel(booking),
          ]),
        )
      : {};

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <FlagIcon data-icon="inline-start" />
        Open a dispute
      </DialogTrigger>
      <DialogContent className="rounded-none sm:max-w-xl">
        <DialogHeader>
          <p className="eyebrow text-clay">Open a dispute</p>
          <DialogTitle className="text-3xl font-normal leading-none">
            Report an issue
          </DialogTitle>
          <DialogDescription>
            Let the resource&apos;s administrators know about a problem with
            a completed booking of yours, such as a resource that was
            unavailable, broken, or didn&apos;t match the description.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-5"
          aria-busy={isSubmitting}
          onSubmit={submitDispute}
        >
          <Field>
            <FieldLabel htmlFor="dispute-booking-id">
              Booking
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </FieldLabel>
            <Select
              items={bookingLabels}
              value={bookingId}
              disabled={
                bookingOptions.status !== "loaded" ||
                bookingOptions.bookings.length === 0
              }
              onValueChange={(value) => {
                if (typeof value === "string") {
                  setBookingId(value);
                }
              }}
            >
              <SelectTrigger id="dispute-booking-id" className="w-full">
                <SelectValue
                  placeholder={bookingSelectPlaceholder(bookingOptions)}
                />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(bookingLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              {bookingOptions.status === "error"
                ? "Your completed bookings could not be loaded. Close and reopen this dialog to try again."
                : "Choose the completed booking you found an issue with."}
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="dispute-reason">Reason</FieldLabel>
            <Select
              items={reasonLabels}
              value={reason}
              onValueChange={(value) => {
                if (typeof value === "string") {
                  setReason(value as DisputeReason);
                }
              }}
            >
              <SelectTrigger id="dispute-reason" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(reasonLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="dispute-description">
              Description
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </FieldLabel>
            <Textarea
              id="dispute-description"
              maxLength={2000}
              value={description}
              placeholder="Describe what happened"
              onChange={(event) => setDescription(event.target.value)}
              required
            />
            <FieldDescription>Up to 2000 characters.</FieldDescription>
          </Field>

          {error ? (
            <p
              className="border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isSubmitting || !bookingId}>
              {isSubmitting ? "Submitting..." : "Submit dispute"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function bookingSelectPlaceholder(state: BookingOptionsState): string {
  if (state.status === "loading") {
    return "Loading your completed bookings...";
  }

  if (state.status === "error") {
    return "Unable to load your bookings";
  }

  return state.bookings.length === 0
    ? "You have no completed bookings yet"
    : "Select a booking";
}

function formatBookingOptionLabel(booking: UserBooking): string {
  const startsAt = new Date(booking.resourceSlot.startsAt);
  const date = Number.isNaN(startsAt.getTime())
    ? "Unknown date"
    : new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
      }).format(startsAt);

  return `${booking.resourceSlot.resource.name} — ${date}`;
}
