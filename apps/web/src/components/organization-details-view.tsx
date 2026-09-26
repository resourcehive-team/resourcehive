"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { MembershipRequestCard } from "@/components/membership-request-card";
import { MembershipStatusBadge } from "@/components/membership-status-badge";
import { OrganizationSummaryCard } from "@/components/organization-summary-card";
import { RequestErrorCard } from "@/components/request-error-card";
import { AllocatePointsDialog } from "@/components/allocate-points-dialog";
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
import { ApiAuthenticationError, ApiError } from "@/lib/api-client";
import {
  AuthenticationRequiredError,
  getCurrentUser,
} from "@/lib/auth-api";
import {
  formatOrganizationDate,
  formatOrganizationLabel,
  formatOrganizationPoints,
} from "@/lib/resource-service/organization-format";
import { getOrganizationDetails } from "@/lib/resource-service/organization-api";
import { getCurrentUserMemberships } from "@/lib/resource-service/membership-api";
import type {
  Membership,
  Organization,
  OrganizationDetails,
} from "@/lib/resource-service/types";

type DetailsState =
  | { status: "loading" }
  | { status: "loaded"; organization: OrganizationDetails | null }
  | { status: "error"; error: unknown };

type ViewerState =
  | { status: "loading" }
  | { status: "loaded"; platformRole: string; membership: Membership | null }
  | { status: "error"; error: unknown };

export function OrganizationDetailsView({
  organizationId,
}: {
  organizationId: string;
}) {
  const router = useRouter();
  const [state, setState] = React.useState<DetailsState>({
    status: "loading",
  });
  const [requestAttempt, setRequestAttempt] = React.useState(0);
  const [viewerState, setViewerState] = React.useState<ViewerState>({
    status: "loading",
  });
  const [viewerRequestAttempt, setViewerRequestAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();

    getOrganizationDetails(organizationId, controller.signal)
      .then((organization) => {
        setState({ status: "loaded", organization });
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        if (requestError instanceof ApiError && requestError.status === 404) {
          setState({ status: "loaded", organization: null });
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

  React.useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      getCurrentUser(controller.signal),
      getCurrentUserMemberships(controller.signal),
    ])
      .then(([account, memberships]) => {
        if (controller.signal.aborted) {
          return;
        }

        setViewerState({
          status: "loaded",
          platformRole: account.user.platformRole,
          membership:
            memberships.find(
              (membership) => membership.organizationId === organizationId,
            ) ?? null,
        });
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        if (
          requestError instanceof AuthenticationRequiredError ||
          requestError instanceof ApiAuthenticationError
        ) {
          router.replace("/login");
          router.refresh();
          return;
        }

        setViewerState({ status: "error", error: requestError });
      });

    return () => controller.abort();
  }, [organizationId, router, viewerRequestAttempt]);

  function retryRequest() {
    setState({ status: "loading" });
    setRequestAttempt((attempt) => attempt + 1);
  }

  function retryViewerRequest() {
    setViewerState({ status: "loading" });
    setViewerRequestAttempt((attempt) => attempt + 1);
  }

  if (state.status === "loading") {
    return <OrganizationDetailsSkeleton />;
  }

  if (state.status === "error") {
    return (
      <RequestErrorCard
        error={state.error}
        subject="Organization"
        onRetry={retryRequest}
      />
    );
  }

  if (state.organization === null) {
    return <OrganizationNotFound />;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <OrganizationOverview organization={state.organization} />
      </div>
      <div className="lg:col-span-4 lg:pt-20">
        <OrganizationActionPanel
          organization={state.organization}
          viewerState={viewerState}
          onRetryViewer={retryViewerRequest}
          onMembershipCreated={(membership) => {
            setViewerState((currentState) =>
              currentState.status === "loaded"
                ? { ...currentState, membership }
                : currentState,
            );
          }}
        />
      </div>
      <div className="lg:col-span-12">
        <ChildOrganizationList organizations={state.organization.children} />
      </div>
    </div>
  );
}

function OrganizationActionPanel({
  organization,
  viewerState,
  onRetryViewer,
  onMembershipCreated,
}: {
  organization: OrganizationDetails;
  viewerState: ViewerState;
  onRetryViewer: () => void;
  onMembershipCreated: (membership: Membership) => void;
}) {
  if (viewerState.status === "loading") {
    return <OrganizationActionSkeleton />;
  }

  if (viewerState.status === "error") {
    return (
      <RequestErrorCard
        error={viewerState.error}
        subject="Membership status"
        onRetry={onRetryViewer}
      />
    );
  }

  const membership = viewerState.membership;
  const isPlatformAdmin = viewerState.platformRole.toUpperCase() === "PLATFORM_ADMIN";
  const isApprovedRootAdmin =
    organization.parentId === null &&
    membership?.organizationId === organization.id &&
    membership.status.toUpperCase() === "APPROVED" &&
    membership.role.toUpperCase() === "ADMIN";

  return (
    <div className="flex flex-col gap-4">
      {membership ? (
        <OrganizationMembershipSummary
          organizationName={organization.name}
          membership={membership}
        />
      ) : isPlatformAdmin ? null : (
        <MembershipRequestCard
          organizationId={organization.id}
          organizationName={organization.name}
          onMembershipCreated={onMembershipCreated}
        />
      )}
      {isApprovedRootAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Semester Points</CardTitle>
            <CardDescription>
              Allocate points to child organizations and their members.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AllocatePointsDialog rootOrganizationId={organization.id} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function OrganizationMembershipSummary({
  organizationName,
  membership,
}: {
  organizationName: string;
  membership: Membership;
}) {
  const normalizedStatus = membership.status.toUpperCase();
  const description =
    normalizedStatus === "APPROVED"
      ? `Your ${formatOrganizationLabel(membership.role)} membership gives you access to ${organizationName}.`
      : normalizedStatus === "PENDING"
        ? "Your request is waiting for an organization administrator to review it."
        : normalizedStatus === "REJECTED"
          ? "Self-service resubmission is closed. Contact an administrator if you want this decision reconsidered."
          : "This membership is not currently active. Contact an organization administrator for help.";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your membership</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <MembershipStatusBadge status={membership.status} />
          <Badge variant="secondary">
            {formatOrganizationLabel(membership.role)}
          </Badge>
        </div>
        {normalizedStatus === "REJECTED" && membership.reviewNote ? (
          <div className="border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <p className="font-medium">Review reason</p>
            <p className="mt-1 text-muted-foreground">
              {membership.reviewNote}
            </p>
          </div>
        ) : null}
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          render={<Link href="/dashboard/memberships" />}
        >
          View my memberships
        </Button>
      </CardFooter>
    </Card>
  );
}

function OrganizationOverview({
  organization,
}: {
  organization: OrganizationDetails;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-3 text-clay">Organization profile</p>
          <h2 className="screen-title">
            {organization.name}
          </h2>
          <p className="screen-description">
            {formatOrganizationLabel(organization.type)}
          </p>
        </div>
        <Badge
          variant={
            organization.status.toUpperCase() === "ACTIVE"
              ? "success"
              : "outline"
          }
        >
          {formatOrganizationLabel(organization.status)}
        </Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Organization information</CardTitle>
          <CardDescription>
            General information configured for this organization.
          </CardDescription>
          <CardAction>
            <Badge variant="secondary">
              {organization.parentId === null
                ? "Root organization"
                : "Child organization"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-muted-foreground">Organization type</dt>
              <dd className="font-medium">
                {formatOrganizationLabel(organization.type)}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">Joining bonus</dt>
              <dd className="font-medium">
                {formatOrganizationPoints(organization.joinBonusPoints)} points
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium">
                {formatOrganizationLabel(organization.status)}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">Added</dt>
              <dd className="font-medium">
                <time dateTime={organization.createdAt}>
                  {formatOrganizationDate(organization.createdAt)}
                </time>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function ChildOrganizationList({
  organizations,
}: {
  organizations: Organization[];
}) {
  return (
    <section aria-labelledby="child-organizations-heading" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3
            id="child-organizations-heading"
            className="font-serif text-3xl font-normal tracking-[-0.035em]"
          >
            Child organizations
          </h3>
          <p className="text-muted-foreground">
            Organizations directly beneath this organization.
          </p>
        </div>
        <Badge variant="secondary">
          {organizations.length}{" "}
          {organizations.length === 1 ? "organization" : "organizations"}
        </Badge>
      </div>
      {organizations.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No child organizations</CardTitle>
            <CardDescription>
              This organization does not have any organizations directly
              beneath it.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="shared-panel-grid *:data-[slot=card]:border-0 md:grid-cols-2 xl:grid-cols-3">
          {organizations.map((organization) => (
            <OrganizationSummaryCard
              key={organization.id}
              organization={organization}
            />
          ))}
        </div>
      )}
    </section>
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

function OrganizationDetailsSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading organization details"
      className="flex flex-col gap-6"
    >
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-36" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function OrganizationActionSkeleton() {
  return (
    <Card aria-busy="true" aria-label="Loading membership actions">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-full" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-9 w-40" />
      </CardContent>
    </Card>
  );
}
