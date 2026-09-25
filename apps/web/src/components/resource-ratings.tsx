"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { StarIcon } from "lucide-react";

import { RequestErrorCard } from "@/components/request-error-card";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ApiAuthenticationError } from "@/lib/api-client";
import {
  getResourceRatings,
  submitResourceRating,
} from "@/lib/resource-service/resource-api";
import type { ResourceRatingSummary } from "@/lib/resource-service/types";
import { cn } from "@/lib/utils";
import { formatOrganizationDate } from "@/lib/resource-service/organization-format";

type RatingsState =
  | { status: "loading" }
  | { status: "loaded"; summary: ResourceRatingSummary }
  | { status: "error"; error: unknown };

export function ResourceRatingsList({
  organizationId,
  resourceId,
  isActive,
}: {
  organizationId: string;
  resourceId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [attempt, setAttempt] = React.useState(0);
  const [ratingsState, setRatingsState] = React.useState<RatingsState>({
    status: "loading",
  });

  React.useEffect(() => {
    const controller = new AbortController();

    getResourceRatings(organizationId, resourceId, controller.signal)
      .then((summary) => {
        if (!controller.signal.aborted) {
          setRatingsState({ status: "loaded", summary });
        }
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setRatingsState({ status: "error", error: requestError });

        if (requestError instanceof ApiAuthenticationError) {
          router.replace("/login");
          router.refresh();
        }
      });

    return () => controller.abort();
  }, [attempt, organizationId, resourceId, router]);

  const handleRatingSubmitted = React.useCallback(() => {
    setRatingsState({ status: "loading" });
    setAttempt((currentAttempt) => currentAttempt + 1);
  }, []);

  if (ratingsState.status === "loading") {
    return <RatingsSkeleton />;
  }

  if (ratingsState.status === "error") {
    return (
      <div className="mt-8">
        <RequestErrorCard
          error={ratingsState.error}
          subject="Resource ratings"
          onRetry={() => {
            setRatingsState({ status: "loading" });
            setAttempt((currentAttempt) => currentAttempt + 1);
          }}
        />
      </div>
    );
  }

  const { summary } = ratingsState;

  return (
    <section className="mt-8 border border-line bg-paper">
      <div className="flex flex-col gap-4 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between lg:p-7">
        <div>
          <h2 className="font-heading text-2xl">Resource ratings</h2>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center text-ochre">
              {Array.from({ length: 5 }).map((_, index) => (
                <StarIcon
                  key={index}
                  className={cn("size-5", {
                    "fill-current": index < Math.round(summary.average),
                  })}
                />
              ))}
            </div>
            <span className="text-sm font-medium">
              {summary.average > 0
                ? summary.average.toFixed(1)
                : "Unrated"}
            </span>
            <span className="text-sm text-muted-foreground">
              ({summary.total ?? 0}{" "}
              {summary.total === 1 ? "review" : "reviews"})
            </span>
          </div>
        </div>
        <SubmitRatingDialog
          disabled={!isActive}
          organizationId={organizationId}
          resourceId={resourceId}
          onSubmitted={handleRatingSubmitted}
        />
      </div>

      <div className="divide-y divide-line">
        {summary.ratings.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No ratings have been submitted yet. Be the first to review!
          </div>
        ) : (
          summary.ratings.map((rating) => (
            <article key={rating.id} className="p-5 lg:p-7">
              <div className="flex items-center gap-4">
                <UserAvatar
                  name={
                    rating.user
                      ? `${rating.user.firstName} ${rating.user.lastName}`
                      : "ResourceHive user"
                  }
                  email={rating.user?.email}
                  avatarUrl={rating.user?.avatarUrl}
                  className="size-10"
                />
                <div>
                  <p className="font-medium">
                    {rating.user
                      ? `${rating.user.firstName} ${rating.user.lastName}`.trim() ||
                        rating.user.email
                      : "ResourceHive user"}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex text-ochre">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <StarIcon
                          key={index}
                          className={cn("size-3.5", {
                            "fill-current": index < rating.rating,
                          })}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatOrganizationDate(rating.createdAt)}
                  </p>
                </div>
              </div>
              {rating.comment && (
                <p className="mt-4 text-sm leading-relaxed text-foreground">
                  {rating.comment}
                </p>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function RatingsSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading ratings"
      className="mt-8 border border-line bg-paper"
    >
      <div className="border-b border-line p-5 lg:p-7">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-5 w-32" />
      </div>
      <div className="p-5 lg:p-7">
        <div className="flex items-center gap-4">
          <Skeleton className="size-10 rounded-full" />
          <div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        </div>
        <Skeleton className="mt-4 h-16 w-full" />
      </div>
    </div>
  );
}

function SubmitRatingDialog({
  disabled,
  organizationId,
  resourceId,
  onSubmitted,
}: {
  disabled: boolean;
  organizationId: string;
  resourceId: string;
  onSubmitted: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [rating, setRating] = React.useState(0);
  const [comment, setComment] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await submitResourceRating(organizationId, resourceId, {
        rating,
        comment,
      });
      setOpen(false);
      onSubmitted();
    } catch (err) {
      if (err instanceof ApiAuthenticationError) {
        router.replace("/login");
        router.refresh();
      } else {
        setError(err instanceof Error ? err.message : "Failed to submit rating.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setRating(0);
      setComment("");
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button disabled={disabled} variant="outline" />}
      >
        Leave a review
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave a review</DialogTitle>
          <DialogDescription>
            Share your experience with this resource to help others in the
            organization.
          </DialogDescription>
        </DialogHeader>

        <form id="rating-form" onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <Label>Rating</Label>
              <FieldContent>
                <div className="flex items-center gap-1 text-ochre/25">
                  {Array.from({ length: 5 }).map((_, index) => {
                    const starValue = index + 1;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setRating(starValue)}
                        className={cn("focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm transition-colors", {
                          "text-ochre": starValue <= rating,
                          "hover:text-ochre/75": starValue > rating,
                        })}
                      >
                        <StarIcon className="size-8 fill-current" />
                        <span className="sr-only">{starValue} stars</span>
                      </button>
                    );
                  })}
                </div>
              </FieldContent>
            </Field>
            
            <Field>
              <FieldLabel htmlFor="rating-comment">Comment (Optional)</FieldLabel>
              <FieldContent>
                <Textarea
                  id="rating-comment"
                  name="comment"
                  placeholder="Tell others what you thought..."
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </FieldContent>
            </Field>

            {error && (
              <FieldError className="text-destructive">{error}</FieldError>
            )}
          </FieldGroup>
        </form>

        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="rating-form"
            disabled={rating === 0 || isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit rating"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
