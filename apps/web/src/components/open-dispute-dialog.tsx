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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiAuthenticationError } from "@/lib/api-client";
import { openDispute } from "@/lib/booking-service/dispute-api";
import type { Dispute, DisputeReason } from "@/lib/booking-service/types";

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

  function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      setBookingId("");
      setReason("UNAVAILABLE");
      setDescription("");
      setError("");
    }
  }

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
              Booking ID
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </FieldLabel>
            <Input
              id="dispute-booking-id"
              value={bookingId}
              placeholder="e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
              onChange={(event) => setBookingId(event.target.value)}
              required
            />
            <FieldDescription>
              Find this on your completed booking under &quot;My
              bookings&quot;.
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit dispute"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
