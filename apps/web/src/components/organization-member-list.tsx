"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { MembershipStatusBadge } from "@/components/membership-status-badge";
import { RequestErrorCard } from "@/components/request-error-card";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiAuthenticationError, ApiError } from "@/lib/api-client";
import { getOrganizationMembers } from "@/lib/resource-service/membership-api";
import {
  formatOrganizationDate,
  formatOrganizationLabel,
} from "@/lib/resource-service/organization-format";
import { getOrganizationDetails } from "@/lib/resource-service/organization-api";
import type {
  OrganizationDetails,
  OrganizationMember,
  OrganizationMemberUser,
} from "@/lib/resource-service/types";

type MembersState =
  | { status: "loading" }
  | {
      status: "loaded";
      organization: OrganizationDetails;
      members: OrganizationMember[];
    }
  | { status: "not-found" }
  | { status: "error"; error: unknown };

export function OrganizationMemberList({
  organizationId,
}: {
  organizationId: string;
}) {
  const router = useRouter();
  const [state, setState] = React.useState<MembersState>({
    status: "loading",
  });
  const [requestAttempt, setRequestAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      getOrganizationDetails(organizationId, controller.signal),
      getOrganizationMembers(organizationId, controller.signal),
    ])
      .then(([organization, members]) => {
        if (organization === null) {
          setState({ status: "not-found" });
          return;
        }

        setState({ status: "loaded", organization, members });
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        if (requestError instanceof ApiError && requestError.status === 404) {
          setState({ status: "not-found" });
          return;
        }

        setState({ status: "error", error: requestError });

        if (requestError instanceof ApiAuthenticationError) {
          router.replace("/login");
          router.refresh();
        }
      });

    return () => controller.abort();
  }, [organizationId, requestAttempt, router]);

  function retryRequest() {
    setState({ status: "loading" });
    setRequestAttempt((attempt) => attempt + 1);
  }

  if (state.status === "loading") {
    return <OrganizationMemberListSkeleton />;
  }

  if (state.status === "error") {
    return (
      <RequestErrorCard
        error={state.error}
        subject="Organization members"
        onRetry={retryRequest}
      />
    );
  }

  if (state.status === "not-found") {
    return <OrganizationNotFound />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow mb-3 text-clay">Organization administration</p>
        <h2 className="screen-title">
          {state.organization.name}
        </h2>
        <p className="screen-description">
          Review members and membership requests for this organization.
        </p>
      </div>
      {state.members.length === 0 ? (
        <EmptyOrganizationMembers />
      ) : (
        <OrganizationMembersTable members={state.members} />
      )}
    </div>
  );
}

function OrganizationMembersTable({
  members,
}: {
  members: OrganizationMember[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Members and requests</CardTitle>
        <CardDescription>
          Membership information available to organization administrators.
        </CardDescription>
        <CardAction>
          <Badge variant="secondary">
            {members.length} {members.length === 1 ? "record" : "records"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableCaption className="sr-only">
            Members and membership requests
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Membership</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Membership date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={`${member.organizationId}:${member.userId}`}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {memberInitials(member.user)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{memberName(member.user)}</p>
                      <p className="text-muted-foreground">
                        {member.user.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {formatOrganizationLabel(member.role)}
                </TableCell>
                <TableCell>
                  <MembershipStatusBadge status={member.status} />
                </TableCell>
                <TableCell>
                  <Badge variant={accountStatusVariant(member.user.status)}>
                    {formatOrganizationLabel(member.user.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <time dateTime={member.joinedAt}>
                    {formatOrganizationDate(member.joinedAt)}
                  </time>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function EmptyOrganizationMembers() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>No membership records</CardTitle>
        <CardDescription>
          This organization does not have members or pending membership
          requests yet.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function OrganizationNotFound() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization not found</CardTitle>
        <CardDescription>
          This organization may no longer exist or the link may be incorrect.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          render={<Link href="/dashboard/organizations" />}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Back to organizations
        </Button>
      </CardContent>
    </Card>
  );
}

function OrganizationMemberListSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading organization members"
      className="flex flex-col gap-6"
    >
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </CardHeader>
        <CardContent className="grid gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function memberName(user: OrganizationMemberUser): string {
  const name = `${user.firstName} ${user.lastName}`.trim();
  return name || user.email;
}

function memberInitials(user: OrganizationMemberUser): string {
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
    .trim()
    .toUpperCase();

  return initials || user.email.charAt(0).toUpperCase() || "?";
}

function accountStatusVariant(
  status: string,
): "success" | "destructive" | "outline" {
  const normalizedStatus = status.toUpperCase();

  if (normalizedStatus === "ACTIVE") {
    return "success";
  }

  if (normalizedStatus === "SUSPENDED") {
    return "destructive";
  }

  return "outline";
}
