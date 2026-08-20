"use client";

import * as React from "react";
import {
  CalendarIcon,
  CalendarPlusIcon,
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
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
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
import { createResourceSlot } from "@/lib/booking-service/booking-api";
import type { ResourceSlot } from "@/lib/booking-service/types";
import { cn } from "@/lib/utils";

const HOUR_OPTIONS = timeOptions(24);
const MINUTE_OPTIONS = timeOptions(60);

interface SlotRange {
  startsAt: Date;
  endsAt: Date;
}

export function ResourceSlotCreationDialog({
  disabled = false,
  resourceId,
  resourceName,
}: {
  disabled?: boolean;
  resourceId: string;
  resourceName: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [range, setRange] = React.useState<SlotRange>(createInitialRange);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [createdSlot, setCreatedSlot] = React.useState<ResourceSlot | null>(
    null,
  );

  function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      setRange(createInitialRange());
      setFormError("");
      setCreatedSlot(null);
    }
  }

  async function submitSlot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const validationError = slotRangeError(range);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      const slot = await createResourceSlot(
        resourceId,
        range.startsAt,
        range.endsAt,
      );
      setCreatedSlot(slot);
    } catch (requestError) {
      if (requestError instanceof ApiAuthenticationError) {
        window.location.assign("/login");
        return;
      }

      setFormError(slotCreationErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger
        disabled={disabled}
        render={<Button disabled={disabled} variant="outline" />}
      >
        <CalendarPlusIcon data-icon="inline-start" />
        Create slot
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto rounded-none sm:max-w-3xl">
        {createdSlot ? (
          <SlotCreationConfirmation
            resourceName={resourceName}
            slot={createdSlot}
          />
        ) : (
          <>
            <DialogHeader>
              <p className="eyebrow text-clay">Publish availability</p>
              <DialogTitle className="text-3xl font-normal leading-none">
                Create a slot for {resourceName}
              </DialogTitle>
              <DialogDescription>
                Set the exact start and end of the period members can reserve.
                Times are entered in your local timezone.
              </DialogDescription>
            </DialogHeader>
            <form
              className="grid gap-5"
              aria-busy={isSubmitting}
              onSubmit={submitSlot}
            >
              <div className="grid border border-line bg-paper-alt sm:grid-cols-2">
                <DateTimeField
                  className="border-b border-line sm:border-r sm:border-b-0"
                  id="slot-start"
                  label="From"
                  value={range.startsAt}
                  onChange={(startsAt) => {
                    setRange((currentRange) => ({
                      ...currentRange,
                      startsAt,
                    }));
                    setFormError("");
                  }}
                />
                <DateTimeField
                  id="slot-end"
                  label="To"
                  value={range.endsAt}
                  onChange={(endsAt) => {
                    setRange((currentRange) => ({
                      ...currentRange,
                      endsAt,
                    }));
                    setFormError("");
                  }}
                />
              </div>
              <FieldDescription>
                The booking service will reject overlapping slots and confirm
                that you can manage this resource.
              </FieldDescription>
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
                  {isSubmitting ? "Creating slot..." : "Create slot"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DateTimeField({
  className,
  id,
  label,
  value,
  onChange,
}: {
  className?: string;
  id: string;
  label: string;
  value: Date;
  onChange: (value: Date) => void;
}) {
  const hour = paddedNumber(value.getHours());
  const minute = paddedNumber(value.getMinutes());

  return (
    <fieldset className={cn("grid gap-4 p-4", className)}>
      <legend className="eyebrow px-1 text-clay">{label}</legend>
      <Field>
        <FieldLabel id={`${id}-date-label`}>Date</FieldLabel>
        <Popover>
          <PopoverTrigger
            render={
              <Button
                id={`${id}-date`}
                type="button"
                variant="outline"
                className="w-full justify-start font-normal"
                aria-labelledby={`${id}-date-label ${id}-date`}
              />
            }
          >
            <CalendarIcon data-icon="inline-start" />
            {formatDate(value)}
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-auto rounded-none p-0"
          >
            <Calendar
              mode="single"
              required
              selected={value}
              disabled={{ before: startOfToday() }}
              onSelect={(date) => onChange(dateWithTime(date, value))}
            />
          </PopoverContent>
        </Popover>
      </Field>
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <Field>
          <FieldLabel htmlFor={`${id}-hour`}>Hour</FieldLabel>
          <Select
            items={HOUR_OPTIONS}
            value={hour}
            onValueChange={(nextHour) => {
              if (typeof nextHour === "string") {
                onChange(dateWithTime(value, value, Number(nextHour)));
              }
            }}
          >
            <SelectTrigger id={`${id}-hour`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(HOUR_OPTIONS).map(([option, optionLabel]) => (
                <SelectItem key={option} value={option}>
                  {optionLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <span className="pb-2 text-muted-foreground" aria-hidden="true">
          :
        </span>
        <Field>
          <FieldLabel htmlFor={`${id}-minute`}>Minute</FieldLabel>
          <Select
            items={MINUTE_OPTIONS}
            value={minute}
            onValueChange={(nextMinute) => {
              if (typeof nextMinute === "string") {
                onChange(
                  dateWithTime(value, value, undefined, Number(nextMinute)),
                );
              }
            }}
          >
            <SelectTrigger id={`${id}-minute`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(MINUTE_OPTIONS).map(
                ([option, optionLabel]) => (
                  <SelectItem key={option} value={option}>
                    {optionLabel}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </fieldset>
  );
}

function SlotCreationConfirmation({
  resourceName,
  slot,
}: {
  resourceName: string;
  slot: ResourceSlot;
}) {
  return (
    <>
      <DialogHeader>
        <CheckCircle2Icon className="size-6 text-clay" />
        <p className="eyebrow text-clay">Slot created</p>
        <DialogTitle className="text-3xl font-normal leading-none">
          Availability is published.
        </DialogTitle>
        <DialogDescription>
          Members with access to {resourceName} can now reserve this period.
        </DialogDescription>
      </DialogHeader>
      <dl className="grid border border-line text-sm sm:grid-cols-2">
        <div className="border-b border-line p-4 sm:border-r sm:border-b-0">
          <dt className="eyebrow text-muted-foreground">From</dt>
          <dd className="mt-2 font-medium">{formatDateTime(slot.startsAt)}</dd>
        </div>
        <div className="p-4">
          <dt className="eyebrow text-muted-foreground">To</dt>
          <dd className="mt-2 font-medium">{formatDateTime(slot.endsAt)}</dd>
        </div>
      </dl>
      <DialogFooter>
        <DialogClose render={<Button />}>Done</DialogClose>
      </DialogFooter>
    </>
  );
}

function createInitialRange(): SlotRange {
  const startsAt = new Date();

  startsAt.setSeconds(0, 0);
  startsAt.setMinutes(0);
  startsAt.setHours(startsAt.getHours() + 1);

  const endsAt = new Date(startsAt);
  endsAt.setHours(endsAt.getHours() + 1);

  return { startsAt, endsAt };
}

function slotRangeError(range: SlotRange): string | null {
  if (range.startsAt.getTime() <= Date.now()) {
    return "Choose a start time in the future.";
  }

  if (range.endsAt.getTime() <= range.startsAt.getTime()) {
    return "The To time must be later than the From time.";
  }

  return null;
}

function slotCreationErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return "This period overlaps an existing slot. Choose another time range.";
  }

  if (error instanceof ApiError && error.status === 403) {
    return "Administrator access to this resource's owner organization is required.";
  }

  if (error instanceof ApiError && error.status === 404) {
    return "This resource is unavailable or no longer accepts new slots.";
  }

  if (error instanceof ApiError && error.status === 400) {
    return error.message;
  }

  if (error instanceof ApiNetworkError) {
    return "ResourceHive could not be reached. Check your connection and try again.";
  }

  return "The slot could not be created. Please try again.";
}

function dateWithTime(
  date: Date,
  time: Date,
  hour = time.getHours(),
  minute = time.getMinutes(),
): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hour,
    minute,
    0,
    0,
  );
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function timeOptions(count: number): Record<string, string> {
  return Object.fromEntries(
    Array.from({ length: count }, (_, value) => {
      const label = paddedNumber(value);
      return [label, label];
    }),
  );
}

function paddedNumber(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(value);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
