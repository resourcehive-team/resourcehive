"use client";

import { CalendarCheckIcon, CheckCircle2Icon } from "lucide-react";

import {
  CopyBookingReferenceButton,
  DownloadBookingReceiptButton,
} from "@/components/booking-reference-actions";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CreatedBooking } from "@/lib/booking-service/types";

export function BookingConfirmation({
  booking,
  mode = "confirmation",
}: {
  booking: CreatedBooking;
  mode?: "confirmation" | "summary";
}) {
  const isSummary = mode === "summary";

  return (
    <>
      <DialogHeader>
        {isSummary ? (
          <CalendarCheckIcon className="size-6 text-clay" />
        ) : (
          <CheckCircle2Icon className="size-6 text-clay" />
        )}
        <p className="eyebrow text-clay">
          {isSummary ? bookingStatusLabel(booking) : "Booking confirmed"}
        </p>
        <DialogTitle className="text-3xl font-normal leading-none">
          {isSummary ? booking.resourceName : "Your slot is reserved."}
        </DialogTitle>
        <DialogDescription>
          {formatDateTime(booking.startsAt)} to {formatDateTime(booking.endsAt)}.
          {booking.pointsDeducted > 0
            ? ` ${booking.pointsDeducted} points were deducted.`
            : " No points were required."}
        </DialogDescription>
      </DialogHeader>
      <div className="grid border border-line text-sm sm:grid-cols-[10rem_1fr]">
        <div className="border-b border-line p-3 text-muted-foreground sm:border-r sm:border-b-0">
          Reference
        </div>
        <div className="flex min-w-0 items-center justify-between gap-3 p-3">
          <code className="min-w-0 break-all font-mono text-xs font-medium sm:text-sm">
            {booking.id}
          </code>
          <CopyBookingReferenceButton referenceId={booking.id} />
        </div>
      </div>
      <DialogFooter>
        <DownloadBookingReceiptButton booking={booking} />
        <DialogClose render={<Button />}>Done</DialogClose>
      </DialogFooter>
    </>
  );
}

function bookingStatusLabel(booking: CreatedBooking): string {
  const status = booking.status.toUpperCase();

  if (status === "CANCELLED") {
    return "Cancelled booking";
  }

  if (status === "COMPLETED") {
    return "Completed booking";
  }

  if (new Date(booking.endsAt).getTime() < Date.now()) {
    return "Past booking";
  }

  if (new Date(booking.startsAt).getTime() <= Date.now()) {
    return "Booking in progress";
  }

  return "Upcoming booking";
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
