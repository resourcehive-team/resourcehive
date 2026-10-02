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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  addOrganizationAllowlistEmail,
  addOrganizationEmailDomain,
  createChildOrganization,
  getOrganizationAllowlist,
  getOrganizationDetails,
  getOrganizationEmailDomains,
  getRootOrganizationDescendants,
  removeOrganizationAllowlistEmail,
  removeOrganizationEmailDomain,
  updateOrganizationEmailDomain,
  type OrganizationEmailAllowlistEntry,
  type OrganizationEmailDomain,
} from "@/lib/resource-service/organization-api";
import {
  getCurrentUserMemberships,
  getOrganizationMembers,
} from "@/lib/resource-service/membership-api";
import { getAccessibleResources } from "@/lib/resource-service/resource-api";
import type {
  Membership,
  Organization,
  OrganizationDetails,
} from "@/lib/resource-service/types";

const ORGANIZATION_RESOURCE_COUNT_LIMIT = 100;

type DetailsState =
  | { status: "loading" }
  | {
      status: "loaded";
      organization: OrganizationDetails | null;
      memberCount: number;
      resourceCount: number;
    }
  | { status: "error"; error: unknown };

type ViewerState =
  | { status: "loading" }
  | { status: "loaded"; platformRole: string; membership: Membership | null; canAdminister: boolean }
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

    (async () => {
      const organization = await getOrganizationDetails(
        organizationId,
        controller.signal,
      ).catch((requestError: unknown) => {
        if (requestError instanceof ApiError && requestError.status === 404) {
          return null;
        }

        throw requestError;
      });

      if (organization === null) {
        return { organization, memberCount: 0, resourceCount: 0 };
      }

      const [members, resources] = await Promise.all([
        getOrganizationMembers(organizationId, controller.signal).catch(
          (requestError: unknown) => {
            if (
              requestError instanceof ApiError &&
              requestError.status === 403
            ) {
              return [];
            }
            throw requestError;
          },
        ),
        getAccessibleResources(organizationId, {
          limit: ORGANIZATION_RESOURCE_COUNT_LIMIT,
          signal: controller.signal,
        }).catch((requestError: unknown) => {
          if (
            requestError instanceof ApiError &&
            requestError.status === 403
          ) {
            return {
              data: [],
              total: 0,
              page: 1,
              limit: ORGANIZATION_RESOURCE_COUNT_LIMIT,
            };
          }
          throw requestError;
        }),
      ]);

      return {
        organization,
        memberCount: members.length,
        resourceCount: resources.data.filter(
          (resource) => resource.ownerOrganizationId === organizationId,
        ).length,
      };
    })()
      .then(({ organization, memberCount, resourceCount }) => {
        if (!controller.signal.aborted) {
          setState({
            status: "loaded",
            organization,
            memberCount,
            resourceCount,
          });
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
  }, [organizationId, requestAttempt, router]);

  React.useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      getCurrentUser(controller.signal),
      getCurrentUserMemberships(controller.signal),
      getOrganizationDetails(organizationId, controller.signal),
    ])
      .then(async ([account, memberships, organization]) => {
        if (controller.signal.aborted) {
          return;
        }

        const descendants = account.organizationContext.rootOrganizationId
          ? await getRootOrganizationDescendants(
              account.organizationContext.rootOrganizationId,
            )
          : [];
        const parentById = new Map(descendants.map((item) => [item.id, item.parentId]));
        let currentId: string | null = organization?.id ?? organizationId;
        const ancestorIds = new Set<string>();
        while (currentId && !ancestorIds.has(currentId)) {
          ancestorIds.add(currentId);
          currentId = parentById.get(currentId) ?? null;
        }
        const canAdminister = memberships.some(
          (item) =>
            ancestorIds.has(item.organizationId) &&
            item.role.toUpperCase() === "ADMIN" &&
            item.status.toUpperCase() === "APPROVED",
        );

        setViewerState({
          status: "loaded",
          platformRole: account.user.platformRole,
          canAdminister,
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
        <OrganizationOverview
          memberCount={state.memberCount}
          organization={state.organization}
          resourceCount={state.resourceCount}
        />
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
      {viewerState.status === "loaded" && viewerState.canAdminister ? (
        <div className="lg:col-span-12">
          <OrganizationAdminPanel
            organization={state.organization}
            onChildCreated={(child) =>
              setState((currentState) =>
                currentState.status === "loaded" && currentState.organization
                  ? {
                      ...currentState,
                      organization: {
                        ...currentState.organization,
                        children: [...currentState.organization.children, child],
                      },
                    }
                  : currentState,
              )
            }
          />
        </div>
      ) : null}
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
    viewerState.canAdminister;

  return (
    <div className="flex flex-col gap-4">
      {membership ? (
        <OrganizationMembershipSummary
          organizationName={organization.name}
          membership={membership}
        />
      ) : isPlatformAdmin || viewerState.canAdminister ? null : (
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
          nativeButton={false}
        >
          View my memberships
        </Button>
      </CardFooter>
    </Card>
  );
}

function OrganizationOverview({
  memberCount,
  organization,
  resourceCount,
}: {
  memberCount: number;
  organization: OrganizationDetails;
  resourceCount: number;
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
            <div className="space-y-1">
              <dt className="text-muted-foreground">Members</dt>
              <dd className="font-medium">
                {memberCount} {memberCount === 1 ? "member" : "members"}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">Resources</dt>
              <dd className="font-medium">
                {resourceCount} {resourceCount === 1 ? "resource" : "resources"}
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

function OrganizationAdminPanel({
  organization,
  onChildCreated,
}: {
  organization: OrganizationDetails;
  onChildCreated: (organization: Organization) => void;
}) {
  const router = useRouter();
  const [domains, setDomains] = React.useState<OrganizationEmailDomain[]>([]);
  const [allowlist, setAllowlist] = React.useState<OrganizationEmailAllowlistEntry[]>([]);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState("FACULTY");
  const [adminEmail, setAdminEmail] = React.useState("");
  const [domain, setDomain] = React.useState("");
  const [autoJoin, setAutoJoin] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");

  const reloadRules = React.useCallback(async () => {
    const [nextDomains, nextAllowlist] = await Promise.all([
      getOrganizationEmailDomains(organization.id),
      getOrganizationAllowlist(organization.id),
    ]);
    setDomains(nextDomains);
    setAllowlist(nextAllowlist);
  }, [organization.id]);

  React.useEffect(() => {
    let active = true;
    Promise.all([
      getOrganizationEmailDomains(organization.id),
      getOrganizationAllowlist(organization.id),
    ])
      .then(([nextDomains, nextAllowlist]) => {
        if (!active) return;
        setDomains(nextDomains);
        setAllowlist(nextAllowlist);
      })
      .catch(() => {
        if (active) setError("Could not load email rules.");
      });
    return () => {
      active = false;
    };
  }, [organization.id]);

  async function perform(action: () => Promise<void>) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization administration</CardTitle>
        <CardDescription>
          Create a child organization and manage who can join {organization.name}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void perform(async () => {
              const result = await createChildOrganization(organization.id, {
                name,
                type,
                adminEmail,
              });
              onChildCreated(result.organization);
              setName("");
              setAdminEmail("");
              setMessage(`${result.organization.name} created; ${result.administrator.email} is its admin.`);
              router.refresh();
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="child-organization-name">Child organization name</Label>
            <Input id="child-organization-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="child-organization-type">Type</Label>
            <Select
              value={type}
              onValueChange={(value) => {
                if (typeof value === "string") setType(value);
              }}
            >
              <SelectTrigger id="child-organization-type" className="w-full">
                <SelectValue placeholder="Choose organization type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FACULTY">Faculty</SelectItem>
                <SelectItem value="DEPARTMENT">Department</SelectItem>
                <SelectItem value="CLUB">Club</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="child-organization-admin">First admin email</Label>
            <Input id="child-organization-admin" type="email" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} required />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create organization"}</Button>
          </div>
        </form>

        <div className="grid gap-8 lg:grid-cols-2">
          <section aria-labelledby="organization-domains-heading" className="space-y-4">
            <div>
              <h3 id="organization-domains-heading" className="font-medium">Email domains</h3>
              <p className="text-sm text-muted-foreground">Add exact domains. Turn on automatic approval to approve membership at this organization and its parents.</p>
            </div>
            <form className="space-y-3" onSubmit={(event) => {
              event.preventDefault();
              void perform(async () => {
                await addOrganizationEmailDomain(organization.id, domain, autoJoin);
                setDomain("");
                setAutoJoin(false);
                await reloadRules();
                setMessage("Email domain added.");
              });
            }}>
              <Label htmlFor="organization-domain">Domain</Label>
              <Input id="organization-domain" value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="cse.mrt.ac.lk" required />
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={autoJoin} onCheckedChange={(checked) => setAutoJoin(checked === true)} />
                Automatically approve membership
              </label>
              <Button type="submit" variant="outline" disabled={saving}>Add domain</Button>
            </form>
            <ul className="space-y-2">
              {domains.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 border border-border p-3 text-sm">
                  <span>{item.domain}</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2">
                      <Checkbox checked={item.autoJoin} disabled={saving} onCheckedChange={(checked) => void perform(async () => {
                        await updateOrganizationEmailDomain(organization.id, item.id, checked === true);
                        await reloadRules();
                      })} />
                      Auto approve
                    </label>
                    <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => void perform(async () => {
                      await removeOrganizationEmailDomain(organization.id, item.id);
                      await reloadRules();
                    })}>Remove</Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="organization-allowlist-heading" className="space-y-4">
            <div>
              <h3 id="organization-allowlist-heading" className="font-medium">Email allowlist</h3>
              <p className="text-sm text-muted-foreground">Allow one verified account to join this organization and its parents.</p>
            </div>
            <form className="space-y-3" onSubmit={(event) => {
              event.preventDefault();
              void perform(async () => {
                await addOrganizationAllowlistEmail(organization.id, email);
                setEmail("");
                await reloadRules();
                setMessage("Email added to allowlist.");
              });
            }}>
              <Label htmlFor="organization-allowlist-email">Email address</Label>
              <Input id="organization-allowlist-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              <Button type="submit" variant="outline" disabled={saving}>Add email</Button>
            </form>
            <ul className="space-y-2">
              {allowlist.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 border border-border p-3 text-sm">
                  <span>{item.email}{item.usedAt ? " · used" : ""}</span>
                  <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => void perform(async () => {
                    await removeOrganizationAllowlistEmail(organization.id, item.id);
                    await reloadRules();
                  })}>Remove</Button>
                </li>
              ))}
            </ul>
          </section>
        </div>
        {message ? <p role="status" className="text-sm text-primary">{message}</p> : null}
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
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
