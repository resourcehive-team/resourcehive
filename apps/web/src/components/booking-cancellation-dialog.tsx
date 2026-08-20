"use client";

import * as React from "react";
import { CalendarX2Icon } from "lucide-react";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { ApiAuthenticationError } from "@/lib/api-client";
import { cancelBooking } from "@/lib/booking-service/booking-api";
import type {
  CancelledBooking,
  UserBooking,
} from "@/lib/booking-service/types";

type SlotOutcome = "republish" | "withdraw";

export function BookingCancellationDialog({
  booking,
  isAdmin,
  onCancelled,
}: {
  booking: UserBooking;
  isAdmin: boolean;
  onCancelled: (booking: CancelledBooking) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [slotOutcome, setSlotOutcome] =
    React.useState<SlotOutcome>("republish");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      setReason("");
      setSlotOutcome("republish");
      setError("");
    }
  }

  async function submitCancellation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const cancelledBooking = await cancelBooking(booking.id, {
        reason,
        ...(isAdmin ? { makeSlotAvailable: slotOutcome === "republish" } : {}),
      });
      onCancelled(cancelledBooking);
      setOpen(false);
    } catch (requestError) {
      if (requestError instanceof ApiAuthenticationError) {
        window.location.assign("/login");
        return;
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : "The booking could not be cancelled.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger render={<Button variant="destructive" size="sm" />}>
        <CalendarX2Icon data-icon="inline-start" />
        Cancel booking
      </DialogTrigger>
      <DialogContent className="rounded-none sm:max-w-xl">
        <DialogHeader>
          <p className="eyebrow text-clay">Cancel reservation</p>
          <DialogTitle className="text-3xl font-normal leading-none">
            Cancel {booking.resourceSlot.resource.name}
          </DialogTitle>
          <DialogDescription>
            This action is final. The booking cannot be restored after it is
            cancelled.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-5"
          aria-busy={isSubmitting}
          onSubmit={submitCancellation}
        >
          {isAdmin ? (
            <fieldset className="grid gap-3">
              <legend className="font-medium">What happens to the slot?</legend>
              <p className="text-sm text-muted-foreground">
                The member receives a full refund of the points originally
                deducted.
              </p>
              <RadioGroup
                value={slotOutcome}
                onValueChange={(value) => {
                  if (value === "republish" || value === "withdraw") {
                    setSlotOutcome(value);
                  }
                }}
              >
                <label
                  className="flex cursor-pointer gap-3 border border-line bg-paper-alt p-4 has-data-checked:border-ink"
                  htmlFor={`republish-${booking.id}`}
                >
                  <RadioGroupItem
                    id={`republish-${booking.id}`}
                    value="republish"
                  />
                  <span>
                    <span className="block font-medium">
                      Make slot available again
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      Publish the slot so another member can reserve it.
                    </span>
                  </span>
                </label>
                <label
                  className="flex cursor-pointer gap-3 border border-line bg-paper-alt p-4 has-data-checked:border-ink"
                  htmlFor={`withdraw-${booking.id}`}
                >
                  <RadioGroupItem
                    id={`withdraw-${booking.id}`}
                    value="withdraw"
                  />
                  <span>
                    <span className="block font-medium">Withdraw slot</span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      Keep the slot in history but prevent new reservations.
                    </span>
                  </span>
                </label>
              </RadioGroup>
            </fieldset>
          ) : (
            <div className="border border-line bg-paper-alt p-4">
              <p className="font-medium">50% points refund</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Half of the points originally deducted will be refunded, rounded
                up. The slot will automatically become available again.
              </p>
            </div>
          )}

          <Field>
            <FieldLabel htmlFor={`cancellation-reason-${booking.id}`}>
              Reason <span className="text-muted-foreground">(optional)</span>
            </FieldLabel>
            <Textarea
              id={`cancellation-reason-${booking.id}`}
              maxLength={500}
              value={reason}
              placeholder="Add a short explanation"
              onChange={(event) => setReason(event.target.value)}
            />
            <FieldDescription>Up to 500 characters.</FieldDescription>
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
              Keep booking
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? "Cancelling..." : "Confirm cancellation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
