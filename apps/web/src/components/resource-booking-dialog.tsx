"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  CalendarIcon,
  CheckCircle2Icon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ApiAuthenticationError,
  ApiError,
  ApiNetworkError,
} from "@/lib/api-client";
import {
  createBooking,
  getResourceSlots,
} from "@/lib/booking-service/booking-api";
import type {
  CreatedBooking,
  ResourceSlot,
} from "@/lib/booking-service/types";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, "0"),
);
const MINUTES = Array.from({ length: 60 }, (_, minute) =>
  String(minute).padStart(2, "0"),
);
const HOUR_LABELS = Object.fromEntries(HOURS.map((hour) => [hour, hour]));
const MINUTE_LABELS = Object.fromEntries(
  MINUTES.map((minute) => [minute, minute]),
);

export function ResourceBookingDialog({
  disabled = false,
  resourceId,
  resourceName,
}: {
  disabled?: boolean;
  resourceId: string;
  resourceName: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [fromDate, setFromDate] = React.useState<Date>();
  const [fromTime, setFromTime] = React.useState("09:00");
  const [toDate, setToDate] = React.useState<Date>();
  const [toTime, setToTime] = React.useState("10:00");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [createdBooking, setCreatedBooking] =
    React.useState<CreatedBooking | null>(null);

  function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen) {
      setFormError("");
      setCreatedBooking(null);
    }
  }

  async function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const startsAt = combineDateAndTime(fromDate, fromTime);
    const endsAt = combineDateAndTime(toDate, toTime);

    if (!startsAt || !endsAt) {
      setFormError("Choose both a date and time for From and To.");
      return;
    }

    if (startsAt.getTime() <= Date.now()) {
      setFormError("The booking must start in the future.");
      return;
    }

    if (endsAt.getTime() <= startsAt.getTime()) {
      setFormError("To must be later than From.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      const slots = await getResourceSlots(resourceId, {
        startsAtOrAfter: startsAt,
        startsBefore: endsAt,
        take: 100,
      });
      const matchingSlot = findExactAvailableSlot(slots, startsAt, endsAt);

      if (!matchingSlot) {
        setFormError(
          "There is no available published slot for that exact time. Choose a different From and To time.",
        );
        return;
      }

      const booking = await createBooking(matchingSlot.id);
      setCreatedBooking(booking);
    } catch (requestError) {
      if (requestError instanceof ApiAuthenticationError) {
        window.location.assign("/login");
        return;
      }

      setFormError(bookingErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger
        disabled={disabled}
        render={<Button disabled={disabled} />}
      >
        <CalendarIcon data-icon="inline-start" />
        Create booking
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
        {createdBooking ? (
          <BookingConfirmation booking={createdBooking} />
        ) : (
          <>
            <DialogHeader>
              <p className="eyebrow text-clay">Reserve a published slot</p>
              <DialogTitle className="text-3xl font-normal leading-none">
                Book {resourceName}
              </DialogTitle>
              <DialogDescription>
                Choose the exact From and To date and time of an available slot.
                The booking service will confirm access, availability, and your
                point balance.
              </DialogDescription>
            </DialogHeader>
            <form
              className="grid gap-5"
              aria-busy={isSubmitting}
              onSubmit={submitBooking}
            >
              <div className="grid border border-line md:grid-cols-2">
                <BookingTimeBoundary
                  date={fromDate}
                  disabled={isSubmitting}
                  id="booking-from"
                  label="From"
                  time={fromTime}
                  onDateChange={setFromDate}
                  onTimeChange={setFromTime}
                />
                <BookingTimeBoundary
                  className="border-t md:border-t-0 md:border-l"
                  date={toDate}
                  disabled={isSubmitting}
                  id="booking-to"
                  label="To"
                  time={toTime}
                  onDateChange={setToDate}
                  onTimeChange={setToTime}
                />
              </div>
              {formError ? (
                <p
                  className="border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
                  role="alert"
                >
                  {formError}
                </p>
              ) : null}
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Cancel
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Checking availability..." : "Confirm booking"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BookingTimeBoundary({
  className,
  date,
  disabled,
  id,
  label,
  time,
  onDateChange,
  onTimeChange,
}: {
  className?: string;
  date?: Date;
  disabled: boolean;
  id: string;
  label: string;
  time: string;
  onDateChange: (date?: Date) => void;
  onTimeChange: (time: string) => void;
}) {
  return (
    <fieldset className={cn("grid gap-4 p-4", className)}>
      <legend className="eyebrow px-1 text-clay">{label}</legend>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-date`}>Date</Label>
        <Popover>
          <PopoverTrigger
            disabled={disabled}
            render={
              <Button
                id={`${id}-date`}
                variant="outline"
                className="w-full justify-start bg-paper-alt text-left font-normal"
              />
            }
          >
            <CalendarIcon />
            {date ? format(date, "PPP") : <span>Choose a date</span>}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              disabled={{ before: startOfToday() }}
              onSelect={onDateChange}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="grid gap-2">
        <Label id={`${id}-time-label`}>Time</Label>
        <div
          aria-labelledby={`${id}-time-label`}
          className="grid grid-cols-[1fr_auto_1fr] items-center gap-2"
          role="group"
        >
          <TimePartSelect
            ariaLabel={`${label} hour`}
            disabled={disabled}
            items={HOURS}
            itemLabels={HOUR_LABELS}
            value={timePart(time, 0)}
            onValueChange={(hour) =>
              onTimeChange(`${hour}:${timePart(time, 1)}`)
            }
          />
          <span aria-hidden="true" className="font-medium text-muted-foreground">
            :
          </span>
          <TimePartSelect
            ariaLabel={`${label} minute`}
            disabled={disabled}
            items={MINUTES}
            itemLabels={MINUTE_LABELS}
            value={timePart(time, 1)}
            onValueChange={(minute) =>
              onTimeChange(`${timePart(time, 0)}:${minute}`)
            }
          />
        </div>
      </div>
    </fieldset>
  );
}

function TimePartSelect({
  ariaLabel,
  disabled,
  items,
  itemLabels,
  value,
  onValueChange,
}: {
  ariaLabel: string;
  disabled: boolean;
  items: string[];
  itemLabels: Record<string, string>;
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <Select
      items={itemLabels}
      value={value}
      disabled={disabled}
      onValueChange={(nextValue) => {
        if (typeof nextValue === "string") {
          onValueChange(nextValue);
        }
      }}
    >
      <SelectTrigger aria-label={ariaLabel} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="shadow-none">
        {items.map((item) => (
          <SelectItem key={item} value={item}>
            {item}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function BookingConfirmation({ booking }: { booking: CreatedBooking }) {
  return (
    <>
      <DialogHeader>
        <CheckCircle2Icon className="size-6 text-clay" />
        <p className="eyebrow text-clay">Booking confirmed</p>
        <DialogTitle className="text-3xl font-normal leading-none">
          Your slot is reserved.
        </DialogTitle>
        <DialogDescription>
          {formatDateTime(booking.startsAt)} to {formatDateTime(booking.endsAt)}.
          {booking.pointsDeducted > 0
            ? ` ${booking.pointsDeducted} points were deducted.`
            : " No points were required."}
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 border border-line text-sm">
        <div className="border-r border-line p-3 text-muted-foreground">
          Reference
        </div>
        <div className="p-3 font-medium">{booking.id}</div>
      </div>
      <DialogFooter>
        <DialogClose render={<Button />}>Done</DialogClose>
      </DialogFooter>
    </>
  );
}

function startOfToday(): Date {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function combineDateAndTime(date: Date | undefined, time: string): Date | null {
  const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time);

  if (!date || !timeMatch) {
    return null;
  }

  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  const seconds = Number(timeMatch[3] ?? 0);

  if (hours > 23 || minutes > 59 || seconds > 59) {
    return null;
  }

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    seconds,
  );
}

function timePart(time: string, index: 0 | 1): string {
  const parts = time.split(":");

  return /^\d{2}$/.test(parts[index] ?? "") ? parts[index] : "00";
}

function findExactAvailableSlot(
  slots: ResourceSlot[],
  startsAt: Date,
  endsAt: Date,
): ResourceSlot | undefined {
  return slots.find(
    (slot) =>
      slot.available &&
      new Date(slot.startsAt).getTime() === startsAt.getTime() &&
      new Date(slot.endsAt).getTime() === endsAt.getTime(),
  );
}

function bookingErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return "The booking could not be confirmed because the slot is no longer available or your point balance is insufficient.";
  }

  if (error instanceof ApiError && error.status === 403) {
    return "Your account does not have access to book this resource.";
  }

  if (error instanceof ApiError && error.status === 404) {
    return "That published slot is no longer available.";
  }

  if (error instanceof ApiError && error.status === 400) {
    return error.message;
  }

  if (error instanceof ApiNetworkError) {
    return "ResourceHive could not be reached. Check your connection and try again.";
  }

  return "The booking could not be completed. Please try again.";
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
