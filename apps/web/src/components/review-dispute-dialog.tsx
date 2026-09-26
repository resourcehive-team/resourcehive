"use client";

import * as React from "react";
import { GavelIcon } from "lucide-react";

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
import { updateDispute } from "@/lib/booking-service/dispute-api";
import type {
  Dispute,
  DisputeResourceAction,
  DisputeStatus,
} from "@/lib/booking-service/types";

const NEXT_STATUSES: Record<DisputeStatus, DisputeStatus[]> = {
  OPEN: ["UNDER_REVIEW", "RESOLVED", "REJECTED"],
  UNDER_REVIEW: ["RESOLVED", "REJECTED"],
  RESOLVED: [],
  REJECTED: [],
};

const statusLabels: Record<DisputeStatus, string> = {
  OPEN: "Open",
  UNDER_REVIEW: "Under review",
  RESOLVED: "Resolved",
  REJECTED: "Rejected",
};

const resourceActionLabels: Record<DisputeResourceAction, string> = {
  NONE: "No change",
  MARK_UNAVAILABLE: "Mark resource unavailable",
  RESTORE: "Restore resource to active",
};

export function ReviewDisputeDialog({
  dispute,
  onUpdated,
}: {
  dispute: Dispute;
  onUpdated: (dispute: Dispute) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const nextStatuses = NEXT_STATUSES[dispute.status];
  const [status, setStatus] = React.useState<DisputeStatus | "">("");
  const [resolutionNotes, setResolutionNotes] = React.useState(
    dispute.resolutionNotes ?? "",
  );
  const [resourceAction, setResourceAction] =
    React.useState<DisputeResourceAction>("NONE");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      setStatus("");
      setResolutionNotes(dispute.resolutionNotes ?? "");
      setResourceAction("NONE");
      setError("");
    }
  }

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const isTerminal = status === "RESOLVED" || status === "REJECTED";

    if (isTerminal && !resolutionNotes.trim()) {
      setError("Resolution notes are required to resolve or reject a dispute.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const updated = await updateDispute(dispute.id, {
        ...(status ? { status } : {}),
        resolutionNotes,
        resourceAction,
      });
      onUpdated(updated);
      setOpen(false);
    } catch (requestError) {
      if (requestError instanceof ApiAuthenticationError) {
        window.location.assign("/login");
        return;
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : "The dispute could not be updated.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <GavelIcon data-icon="inline-start" />
        Review
      </DialogTrigger>
      <DialogContent className="rounded-none sm:max-w-xl">
        <DialogHeader>
          <p className="eyebrow text-clay">Review dispute</p>
          <DialogTitle className="text-3xl font-normal leading-none">
            {statusLabels[dispute.status]}
          </DialogTitle>
          <DialogDescription>{dispute.description}</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-5"
          aria-busy={isSubmitting}
          onSubmit={submitReview}
        >
          {nextStatuses.length > 0 ? (
            <Field>
              <FieldLabel htmlFor={`dispute-status-${dispute.id}`}>
                Move to status
              </FieldLabel>
              <Select
                items={{
                  "": "Keep current status",
                  ...Object.fromEntries(
                    nextStatuses.map((value) => [value, statusLabels[value]]),
                  ),
                }}
                value={status}
                onValueChange={(value) => {
                  if (typeof value === "string") {
                    setStatus(value as DisputeStatus | "");
                  }
                }}
              >
                <SelectTrigger
                  id={`dispute-status-${dispute.id}`}
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Keep current status</SelectItem>
                  {nextStatuses.map((value) => (
                    <SelectItem key={value} value={value}>
                      {statusLabels[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : (
            <p className="text-sm text-muted-foreground">
              This dispute is {statusLabels[dispute.status].toLowerCase()}
              and can no longer change status. You may still update the
              linked resource below.
            </p>
          )}

          <Field>
            <FieldLabel htmlFor={`dispute-resource-action-${dispute.id}`}>
              Resource
            </FieldLabel>
            <Select
              items={resourceActionLabels}
              value={resourceAction}
              onValueChange={(value) => {
                if (typeof value === "string") {
                  setResourceAction(value as DisputeResourceAction);
                }
              }}
            >
              <SelectTrigger
                id={`dispute-resource-action-${dispute.id}`}
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(resourceActionLabels).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            <FieldDescription>
              Mark the resource unavailable for a damaged, lost, or unreturned
              item, or restore it once the issue is resolved.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor={`dispute-resolution-notes-${dispute.id}`}>
              Resolution notes
            </FieldLabel>
            <Textarea
              id={`dispute-resolution-notes-${dispute.id}`}
              maxLength={2000}
              value={resolutionNotes}
              placeholder="Explain the outcome of this review"
              onChange={(event) => setResolutionNotes(event.target.value)}
            />
            <FieldDescription>
              Required when moving to resolved or rejected.
            </FieldDescription>
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
              {isSubmitting ? "Saving..." : "Save review"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
