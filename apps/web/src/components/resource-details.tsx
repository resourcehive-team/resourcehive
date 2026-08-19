"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Building2Icon,
  CalendarDaysIcon,
  PackageIcon,
} from "lucide-react";

import { RequestErrorCard } from "@/components/request-error-card";
import { ResourceBookingDialog } from "@/components/resource-booking-dialog";
import { ResourceSlotCreationDialog } from "@/components/resource-slot-creation-dialog";
import { ScreenHeading } from "@/components/screen-heading";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import mockBookingHistory from "@/data/mock-booking-history.json";
import { ApiAuthenticationError } from "@/lib/api-client";
import {
  formatOrganizationDate,
  formatOrganizationLabel,
  formatOrganizationPoints,
} from "@/lib/resource-service/organization-format";
import { getResourceDetails } from "@/lib/resource-service/resource-api";
import type { ResourceDetails as ResourceDetailsData } from "@/lib/resource-service/types";

type ResourceState =
  | { status: "loading" }
  | { status: "loaded"; resource: ResourceDetailsData }
  | { status: "error"; error: unknown };

export function ResourceDetails({
  organizationId,
  resourceId,
}: {
  organizationId: string;
  resourceId: string;
}) {
  const router = useRouter();
  const [attempt, setAttempt] = React.useState(0);
  const [resourceState, setResourceState] = React.useState<ResourceState>({
    status: "loading",
  });

  React.useEffect(() => {
    const controller = new AbortController();

    getResourceDetails(organizationId, resourceId, controller.signal)
      .then((resource) => setResourceState({ status: "loaded", resource }))
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setResourceState({ status: "error", error: requestError });

        if (requestError instanceof ApiAuthenticationError) {
          router.replace("/login");
          router.refresh();
        }
      });

    return () => controller.abort();
  }, [attempt, organizationId, resourceId, router]);

  if (resourceState.status === "loading") {
    return <ResourceDetailsSkeleton />;
  }

  if (resourceState.status === "error") {
    return (
      <RequestErrorCard
        error={resourceState.error}
        subject="Resource details"
        onRetry={() => {
          setResourceState({ status: "loading" });
          setAttempt((currentAttempt) => currentAttempt + 1);
        }}
      />
    );
  }

  const { resource } = resourceState;
  const isActive = resource.status.toUpperCase() === "ACTIVE";

  return (
    <>
      <ScreenHeading
        eyebrow="Resource record"
        title={resource.name}
        description={
          resource.description || "No description has been provided for this resource."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ResourceBookingDialog
              disabled={!isActive}
              resourceId={resource.id}
              resourceName={resource.name}
            />
            <ResourceSlotCreationDialog
              disabled={!isActive}
              resourceId={resource.id}
              resourceName={resource.name}
            />
          </div>
        }
      />
      <section className="grid gap-px border border-line bg-line lg:grid-cols-12">
        <article className="bg-paper-alt p-5 lg:col-span-8 lg:p-7">
          <div className="flex items-start justify-between gap-4 border-b border-line pb-5">
            <div>
              <p className="eyebrow text-clay">Resource information</p>
              <h3 className="mt-2 font-heading text-3xl leading-none">
                Catalogue details
              </h3>
            </div>
            <Badge variant={statusVariant(resource.status)}>
              {formatOrganizationLabel(resource.status)}
            </Badge>
          </div>
          <dl className="grid sm:grid-cols-2">
            <DetailItem
              icon={<Building2Icon />}
              label="Owner organization"
              value={resource.ownerOrganization.name}
            />
            <DetailItem
              icon={<PackageIcon />}
              label="Resource type"
              value="Shared catalogue item"
            />
            <DetailItem
              icon={<CalendarDaysIcon />}
              label="Added"
              value={formatOrganizationDate(resource.createdAt)}
            />
            <DetailItem
              icon={<Building2Icon />}
              label="Organization access"
              value={`${resource.allowedOrganizations.length} approved ${
                resource.allowedOrganizations.length === 1
                  ? "organization"
                  : "organizations"
              }`}
            />
          </dl>
        </article>
        <aside className="flex flex-col justify-between gap-8 bg-ink p-5 text-paper lg:col-span-4 lg:p-7">
          <div>
            <p className="eyebrow text-ochre">Booking cost</p>
            <p className="mt-3 font-heading text-5xl leading-none">
              {formatOrganizationPoints(resource.pointCost)}
            </p>
            <p className="mt-1 text-sm text-paper/70">
              {resource.pointCost === 1 ? "point" : "points"} per published slot
            </p>
          </div>
          <div className="border-t border-paper/25 pt-5">
            <p className="text-sm leading-relaxed text-paper/75">
              Choose an exact published time slot. Access, availability, and
              points are verified by the booking service before confirmation.
            </p>
            {!isActive ? (
              <p className="mt-4 text-sm text-ochre">
                This resource is not accepting new bookings.
              </p>
            ) : null}
          </div>
        </aside>
      </section>
      <BookingHistory />
    </>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactElement<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-line py-5 sm:odd:pr-5 sm:even:border-l sm:even:pl-5">
      <dt className="flex items-center gap-2 text-sm text-muted-foreground">
        {React.cloneElement(icon, { className: "size-4" })}
        {label}
      </dt>
      <dd className="mt-2 font-medium">{value}</dd>
    </div>
  );
}

function BookingHistory() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking history</CardTitle>
        <CardDescription>
          Recent reservations for this resource. Live history will replace this
          preview when the booking history API is available.
        </CardDescription>
        <CardAction>
          <Badge variant="outline">Mock data</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Reference</TableHead>
              <TableHead>Member</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Points</TableHead>
              <TableHead className="pr-5 text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockBookingHistory.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="pl-5 font-medium">{booking.id}</TableCell>
                <TableCell>{booking.member}</TableCell>
                <TableCell>{formatBookingDateTime(booking.startsAt)}</TableCell>
                <TableCell>{formatBookingDateTime(booking.endsAt)}</TableCell>
                <TableCell>{booking.points}</TableCell>
                <TableCell className="pr-5 text-right">
                  <Badge
                    variant={
                      booking.status === "CANCELLED" ? "outline" : "default"
                    }
                  >
                    {formatOrganizationLabel(booking.status)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ResourceDetailsSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading resource details"
      className="grid gap-8"
    >
      <div>
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-12 w-96 max-w-full" />
        <Skeleton className="mt-3 h-4 w-[32rem] max-w-full" />
      </div>
      <div className="grid gap-px border border-line bg-line lg:grid-cols-12">
        <Skeleton className="h-72 rounded-none lg:col-span-8" />
        <Skeleton className="h-72 rounded-none lg:col-span-4" />
      </div>
      <Skeleton className="h-72 w-full rounded-none" />
    </div>
  );
}

function statusVariant(
  status: string,
): "default" | "destructive" | "outline" {
  if (status.toUpperCase() === "ACTIVE") {
    return "default";
  }

  if (status.toUpperCase() === "ARCHIVED") {
    return "destructive";
  }

  return "outline";
}

function formatBookingDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
