"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightIcon } from "lucide-react";

import { getBookingTiming } from "@/components/booking-history";
import { RequestErrorCard } from "@/components/request-error-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiAuthenticationError } from "@/lib/api-client";
import { getOrganizationBookings } from "@/lib/booking-service/booking-api";
import { getCurrentUserMemberships } from "@/lib/resource-service/membership-api";

interface AdministeredOrganization {
  organizationId: string;
  organizationName: string;
  reviewCount: number;
}

type State =
  | { status: "loading" }
  | { status: "loaded"; organizations: AdministeredOrganization[] }
  | { status: "error"; error: unknown };

export function AdminOrganizationsCard() {
  const router = useRouter();
  const [state, setState] = React.useState<State>({ status: "loading" });
  const [requestAttempt, setRequestAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();

    loadAdministeredOrganizations(controller.signal)
      .then((organizations) => {
        if (!controller.signal.aborted) {
          setState({ status: "loaded", organizations });
        }
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setState({ status: "error", error: requestError });

        if (requestError instanceof ApiAuthenticationError) {
          router.replace("/login");
          router.refresh();
        }
      });

    return () => controller.abort();
  }, [requestAttempt, router]);

  if (state.status === "loading") {
    return (
      <Skeleton
        aria-label="Loading organizations you administer"
        aria-busy="true"
        className="h-48 w-full rounded-none"
      />
    );
  }

  if (state.status === "error") {
    return (
      <RequestErrorCard
        error={state.error}
        subject="Organizations you administer"
        onRetry={() => {
          setState({ status: "loading" });
          setRequestAttempt((attempt) => attempt + 1);
        }}
      />
    );
  }

  if (state.organizations.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organizations you administer</CardTitle>
        <CardDescription>
          Bookings awaiting your review, by organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {state.organizations.map((organization) => (
          <div
            className="flex items-center justify-between gap-4 border-b border-line pb-3 last:border-b-0 last:pb-0"
            key={organization.organizationId}
          >
            <div>
              <p className="font-medium">{organization.organizationName}</p>
              <Badge variant="secondary">
                {organization.reviewCount === 1
                  ? "1 booking under review"
                  : `${organization.reviewCount} bookings under review`}
              </Badge>
            </div>
            <Link
              className={buttonVariants({ size: "sm", variant: "outline" })}
              href={`/dashboard/organizations/${organization.organizationId}`}
            >
              View organization
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

async function loadAdministeredOrganizations(
  signal: AbortSignal,
): Promise<AdministeredOrganization[]> {
  const memberships = await getCurrentUserMemberships(signal);
  const administered = memberships.filter(
    (membership) =>
      membership.role.toUpperCase() === "ADMIN" &&
      membership.status.toUpperCase() === "APPROVED",
  );

  if (administered.length === 0) {
    return [];
  }

  const bookings = await getOrganizationBookings(signal);
  const now = Date.now();
  const reviewCounts = new Map<string, number>();

  for (const booking of bookings) {
    const timing = getBookingTiming(booking, now);
    if (timing !== "upcoming" && timing !== "in-progress") {
      continue;
    }

    const organizationId = booking.resourceSlot.resource.ownerOrganizationId;
    reviewCounts.set(organizationId, (reviewCounts.get(organizationId) ?? 0) + 1);
  }

  return administered.map((membership) => ({
    organizationId: membership.organizationId,
    organizationName: membership.organization.name,
    reviewCount: reviewCounts.get(membership.organizationId) ?? 0,
  }));
}
