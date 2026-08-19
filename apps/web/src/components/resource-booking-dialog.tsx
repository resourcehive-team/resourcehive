"use client";

import * as React from "react";
import {
  CalendarIcon,
  CalendarX2Icon,
  RefreshCwIcon,
} from "lucide-react";

import { BookingConfirmation } from "@/components/booking-confirmation";
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
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

type SlotListState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; slots: ResourceSlot[] }
  | { status: "error" };

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
  const [slotList, setSlotList] = React.useState<SlotListState>({
    status: "idle",
  });
  const [selectedSlotId, setSelectedSlotId] = React.useState("");
  const [slotRequestVersion, setSlotRequestVersion] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [createdBooking, setCreatedBooking] =
    React.useState<CreatedBooking | null>(null);

  React.useEffect(() => {
    if (!open || createdBooking) {
      return;
    }

    const controller = new AbortController();
    const earliestStart = new Date();

    getResourceSlots(resourceId, {
      startsAtOrAfter: earliestStart,
      take: 100,
      signal: controller.signal,
    })
      .then((slots) => {
        if (controller.signal.aborted) {
          return;
        }

        setSlotList({
          status: "loaded",
          slots: availableFutureSlots(slots, earliestStart),
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

        setSlotList({ status: "error" });
      });

    return () => controller.abort();
  }, [createdBooking, open, resourceId, slotRequestVersion]);

  function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      setSlotList({ status: "loading" });
      setSelectedSlotId("");
    } else {
      setSlotList({ status: "idle" });
      setSelectedSlotId("");
      setFormError("");
      setCreatedBooking(null);
    }
  }

  function reloadSlots() {
    setFormError("");
    setSlotList({ status: "loading" });
    setSelectedSlotId("");
    setSlotRequestVersion((version) => version + 1);
  }

  async function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const selectedSlot =
      slotList.status === "loaded"
        ? slotList.slots.find((slot) => slot.id === selectedSlotId)
        : undefined;

    if (!selectedSlot) {
      setFormError("Select an available slot before confirming.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      const booking = await createBooking(selectedSlot.id);
      setCreatedBooking(booking);
    } catch (requestError) {
      if (requestError instanceof ApiAuthenticationError) {
        window.location.assign("/login");
        return;
      }

      setFormError(bookingErrorMessage(requestError));

      if (
        requestError instanceof ApiError &&
        (requestError.status === 404 || requestError.status === 409)
      ) {
        setSelectedSlotId("");
        setSlotList({ status: "loading" });
        setSlotRequestVersion((version) => version + 1);
      }
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
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-3xl">
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
                Select one of the available times published for this resource.
                Times are shown in your local timezone; the booking service will
                confirm access and your point balance.
              </DialogDescription>
            </DialogHeader>
            <form
              className="grid gap-5"
              aria-busy={isSubmitting || slotList.status === "loading"}
              onSubmit={submitBooking}
            >
              <SlotSelection
                disabled={isSubmitting}
                selectedSlotId={selectedSlotId}
                slotList={slotList}
                onReload={reloadSlots}
                onSelect={(slotId) => {
                  setSelectedSlotId(slotId);
                  setFormError("");
                }}
              />
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
                {slotList.status === "loaded" && slotList.slots.length > 0 ? (
                  <Button
                    type="submit"
                    disabled={isSubmitting || !selectedSlotId}
                  >
                    {isSubmitting ? "Confirming booking..." : "Confirm booking"}
                  </Button>
                ) : null}
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SlotSelection({
  disabled,
  selectedSlotId,
  slotList,
  onReload,
  onSelect,
}: {
  disabled: boolean;
  selectedSlotId: string;
  slotList: SlotListState;
  onReload: () => void;
  onSelect: (slotId: string) => void;
}) {
  if (slotList.status === "idle" || slotList.status === "loading") {
    return <SlotTableSkeleton />;
  }

  if (slotList.status === "error") {
    return (
      <div className="grid min-h-48 place-items-center gap-4 border border-line p-6 text-center">
        <div className="grid max-w-md gap-2">
          <p className="font-medium">Available slots could not be loaded.</p>
          <p className="text-sm text-muted-foreground">
            Check your connection and try loading the published slots again.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onReload}>
          <RefreshCwIcon data-icon="inline-start" />
          Try again
        </Button>
      </div>
    );
  }

  if (slotList.slots.length === 0) {
    return (
      <div className="grid min-h-48 place-items-center border border-line p-6 text-center">
        <div className="grid max-w-md justify-items-center gap-2">
          <CalendarX2Icon className="mb-2 size-6 text-clay" />
          <p className="font-medium">No available slots</p>
          <p className="text-sm text-muted-foreground">
            This resource has no future published slots right now. Check again
            after a resource administrator publishes another time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <RadioGroup
        aria-label="Available booking slots"
        className="block border border-line"
        disabled={disabled}
        value={selectedSlotId}
        onValueChange={(value) => {
          if (typeof value === "string") {
            onSelect(value);
          }
        }}
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">
                <span className="sr-only">Select</span>
              </TableHead>
              <TableHead>Date</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slotList.slots.map((slot) => {
              const selected = selectedSlotId === slot.id;
              const controlId = `booking-slot-${slot.id}`;

              return (
                <TableRow
                  key={slot.id}
                  className={cn(
                    "cursor-pointer",
                    disabled && "cursor-wait",
                  )}
                  data-state={selected ? "selected" : undefined}
                  onClick={() => {
                    if (!disabled) {
                      onSelect(slot.id);
                    }
                  }}
                >
                  <TableCell>
                    <RadioGroupItem
                      id={controlId}
                      aria-label={`Select ${formatSlotRange(slot)}`}
                      className={cn(
                        selected &&
                          "border-paper bg-paper data-checked:border-paper data-checked:bg-paper [&_[data-slot=radio-group-indicator]>span]:bg-ink",
                      )}
                      value={slot.id}
                    />
                  </TableCell>
                  <TableCell>
                    <label
                      className="cursor-pointer font-medium"
                      htmlFor={controlId}
                    >
                      {formatSlotDate(slot.startsAt)}
                    </label>
                  </TableCell>
                  <TableCell>{formatSlotTime(slot.startsAt)}</TableCell>
                  <TableCell>{formatSlotTime(slot.endsAt)}</TableCell>
                  <TableCell>{formatSlotDuration(slot)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </RadioGroup>
      <p className="text-xs text-muted-foreground">
        Only future slots that are currently available are shown.
      </p>
    </div>
  );
}

function SlotTableSkeleton() {
  return (
    <div
      aria-label="Loading available slots"
      className="grid border border-line"
      role="status"
    >
      <div className="grid grid-cols-[3rem_1.5fr_repeat(3,1fr)] border-b border-line p-3">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-3 w-16 max-w-[70%]" />
        ))}
      </div>
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="grid grid-cols-[3rem_1.5fr_repeat(3,1fr)] items-center border-b border-line p-3 last:border-b-0"
        >
          <Skeleton className="size-4" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
      <span className="sr-only">Loading available booking slots.</span>
    </div>
  );
}

function availableFutureSlots(
  slots: ResourceSlot[],
  earliestStart: Date,
): ResourceSlot[] {
  return slots
    .filter((slot) => {
      const startsAt = new Date(slot.startsAt).getTime();
      const endsAt = new Date(slot.endsAt).getTime();

      return (
        slot.available &&
        Number.isFinite(startsAt) &&
        Number.isFinite(endsAt) &&
        startsAt >= earliestStart.getTime() &&
        endsAt > startsAt
      );
    })
    .sort(
      (left, right) =>
        new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
    );
}

function bookingErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return "That slot is no longer available or your point balance is insufficient. The available slots have been refreshed.";
  }

  if (error instanceof ApiError && error.status === 403) {
    return "Your account does not have access to book this resource.";
  }

  if (error instanceof ApiError && error.status === 404) {
    return "That published slot is no longer available. The available slots have been refreshed.";
  }

  if (error instanceof ApiError && error.status === 400) {
    return error.message;
  }

  if (error instanceof ApiNetworkError) {
    return "ResourceHive could not be reached. Check your connection and try again.";
  }

  return "The booking could not be completed. Please try again.";
}

function formatSlotDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatSlotTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatSlotRange(slot: ResourceSlot): string {
  return `${formatSlotDate(slot.startsAt)}, ${formatSlotTime(slot.startsAt)} to ${formatSlotTime(slot.endsAt)}`;
}

function formatSlotDuration(slot: ResourceSlot): string {
  const milliseconds =
    new Date(slot.endsAt).getTime() - new Date(slot.startsAt).getTime();
  const totalMinutes = Math.round(milliseconds / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${minutes} min`;
}

