"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  Building2Icon,
  UsersIcon,
} from "lucide-react";

import { RequestErrorCard } from "@/components/request-error-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiAuthenticationError } from "@/lib/api-client";
import { getCurrentUserMemberships } from "@/lib/resource-service/membership-api";
import {
  formatOrganizationDate,
  formatOrganizationLabel,
} from "@/lib/resource-service/organization-format";
import type { MembershipWithOrganization } from "@/lib/resource-service/types";

type MembershipsState =
  | { status: "loading" }
  | { status: "loaded"; memberships: MembershipWithOrganization[] }
  | { status: "error"; error: unknown };

export function CurrentMembershipList() {
  const router = useRouter();
  const [state, setState] = React.useState<MembershipsState>({
    status: "loading",
  });
  const [requestAttempt, setRequestAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();

    getCurrentUserMemberships(controller.signal)
      .then((memberships) => {
        setState({ status: "loaded", memberships });
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

  function retryRequest() {
    setState({ status: "loading" });
    setRequestAttempt((attempt) => attempt + 1);
  }

  if (state.status === "loading") {
    return <CurrentMembershipListSkeleton />;
  }

  if (state.status === "error") {
    return (
      <RequestErrorCard
        error={state.error}
        subject="Memberships"
        onRetry={retryRequest}
      />
    );
  }

  if (state.memberships.length === 0) {
    return <EmptyMembershipList />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {state.memberships.map((membership) => (
        <MembershipCard key={membership.id} membership={membership} />
      ))}
    </div>
  );
}

function MembershipCard({
  membership,
}: {
  membership: MembershipWithOrganization;
}) {
  const normalizedStatus = membership.status.toUpperCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2Icon className="size-4" />
          {membership.organization.name}
        </CardTitle>
        <CardDescription>
          {formatOrganizationLabel(membership.organization.type)}
        </CardDescription>
        <CardAction>
          <Badge variant={membershipStatusVariant(normalizedStatus)}>
            {formatOrganizationLabel(membership.status)}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Membership role</dt>
            <dd className="font-medium">
              {formatOrganizationLabel(membership.role)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">
              {normalizedStatus === "APPROVED" ? "Joined" : "Requested"}
            </dt>
            <dd className="font-medium">
              <time dateTime={membership.joinedAt}>
                {formatOrganizationDate(membership.joinedAt)}
              </time>
            </dd>
          </div>
        </dl>
      </CardContent>
      <CardFooter className="gap-2">
        <Button
          variant="outline"
          render={
            <Link
              href={`/dashboard/organizations/${encodeURIComponent(membership.organizationId)}`}
            />
          }
        >
          View organization
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
        {normalizedStatus === "APPROVED" &&
        membership.role.toUpperCase() === "ADMIN" ? (
          <Button
            variant="outline"
            render={
              <Link
                href={`/dashboard/organizations/${encodeURIComponent(membership.organizationId)}/members`}
              />
            }
          >
            <UsersIcon data-icon="inline-start" />
            View members
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}

function EmptyMembershipList() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>No memberships yet</CardTitle>
        <CardDescription>
          Browse organizations and request membership to see it here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          render={<Link href="/dashboard/organizations" />}
        >
          Browse organizations
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </CardContent>
    </Card>
  );
}

function CurrentMembershipListSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading memberships"
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: 3 }, (_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent className="grid gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function membershipStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "APPROVED") {
    return "default";
  }

  if (status === "PENDING") {
    return "secondary";
  }

  if (status === "REJECTED") {
    return "destructive";
  }

  return "outline";
}
