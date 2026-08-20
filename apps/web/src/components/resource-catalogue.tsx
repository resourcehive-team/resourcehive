"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";

import { RequestErrorCard } from "@/components/request-error-card";
import { ResourceCatalogueCard } from "@/components/resource-catalogue-card";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiAuthenticationError } from "@/lib/api-client";
import { getCurrentUserMemberships } from "@/lib/resource-service/membership-api";
import { getAccessibleResources } from "@/lib/resource-service/resource-api";
import type {
  MembershipWithOrganization,
  PaginatedResources,
} from "@/lib/resource-service/types";

const RESOURCE_PAGE_SIZE = 10;
const AGGREGATE_RESOURCE_PAGE_SIZE = 100;
const ALL_ORGANIZATIONS = "all";

interface CatalogueResource {
  accessOrganizationId: string;
  resource: PaginatedResources["data"][number];
}

interface CataloguePage extends Omit<PaginatedResources, "data"> {
  data: CatalogueResource[];
}

type MembershipsState =
  | { status: "loading" }
  | {
      status: "loaded";
      memberships: MembershipWithOrganization[];
    }
  | { status: "error"; error: unknown };

type CatalogueState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; catalogue: CataloguePage }
  | { status: "error"; error: unknown };

export function ResourceCatalogue() {
  const router = useRouter();
  const [membershipsState, setMembershipsState] =
    React.useState<MembershipsState>({ status: "loading" });
  const [membershipsAttempt, setMembershipsAttempt] = React.useState(0);
  const [selectedOrganizationId, setSelectedOrganizationId] =
    React.useState(ALL_ORGANIZATIONS);
  const [searchInput, setSearchInput] = React.useState("");
  const [appliedSearch, setAppliedSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [catalogueAttempt, setCatalogueAttempt] = React.useState(0);
  const [catalogueState, setCatalogueState] =
    React.useState<CatalogueState>({ status: "idle" });

  React.useEffect(() => {
    const controller = new AbortController();

    getCurrentUserMemberships(controller.signal)
      .then((memberships) => {
        const approvedMemberships = memberships.filter(
          (membership) => membership.status.toUpperCase() === "APPROVED",
        );

        setMembershipsState({
          status: "loaded",
          memberships: approvedMemberships,
        });
        setSelectedOrganizationId((currentOrganizationId) =>
          currentOrganizationId === ALL_ORGANIZATIONS ||
          approvedMemberships.some(
            (membership) =>
              membership.organizationId === currentOrganizationId,
          )
            ? currentOrganizationId
            : ALL_ORGANIZATIONS,
        );

        if (approvedMemberships.length > 0) {
          setCatalogueState({ status: "loading" });
        }
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setMembershipsState({ status: "error", error: requestError });

        if (requestError instanceof ApiAuthenticationError) {
          router.replace("/login");
          router.refresh();
        }
      });

    return () => controller.abort();
  }, [membershipsAttempt, router]);

  React.useEffect(() => {
    if (membershipsState.status !== "loaded") {
      return;
    }

    const controller = new AbortController();
    const catalogueRequest =
      selectedOrganizationId === ALL_ORGANIZATIONS
        ? getCombinedCatalogue(
            membershipsState.memberships.map(
              (membership) => membership.organizationId,
            ),
            page,
            appliedSearch,
            controller.signal,
          )
        : getAccessibleResources(selectedOrganizationId, {
            page,
            limit: RESOURCE_PAGE_SIZE,
            search: appliedSearch,
            signal: controller.signal,
          }).then((catalogue) => ({
            ...catalogue,
            data: catalogue.data.map((resource) => ({
              accessOrganizationId: selectedOrganizationId,
              resource,
            })),
          }));

    catalogueRequest
      .then((catalogue) => {
        setCatalogueState({ status: "loaded", catalogue });
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setCatalogueState({ status: "error", error: requestError });

        if (requestError instanceof ApiAuthenticationError) {
          router.replace("/login");
          router.refresh();
        }
      });

    return () => controller.abort();
  }, [
    appliedSearch,
    catalogueAttempt,
    membershipsState,
    page,
    router,
    selectedOrganizationId,
  ]);

  function retryMemberships() {
    setMembershipsState({ status: "loading" });
    setMembershipsAttempt((attempt) => attempt + 1);
  }

  function changeOrganization(organizationId: string) {
    setSelectedOrganizationId(organizationId);
    setPage(1);
    setCatalogueState({ status: "loading" });
  }

  function applySearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(searchInput.trim());
    setCatalogueState({ status: "loading" });
    setCatalogueAttempt((attempt) => attempt + 1);
  }

  function clearSearch() {
    setSearchInput("");
    setAppliedSearch("");
    setPage(1);
    setCatalogueState({ status: "loading" });
    setCatalogueAttempt((attempt) => attempt + 1);
  }

  function changePage(nextPage: number) {
    setPage(nextPage);
    setCatalogueState({ status: "loading" });
  }

  function retryCatalogue() {
    setCatalogueState({ status: "loading" });
    setCatalogueAttempt((attempt) => attempt + 1);
  }

  if (membershipsState.status === "loading") {
    return <ResourceCatalogueSkeleton />;
  }

  if (membershipsState.status === "error") {
    return (
      <RequestErrorCard
        error={membershipsState.error}
        subject="Organization memberships"
        onRetry={retryMemberships}
      />
    );
  }

  if (membershipsState.memberships.length === 0) {
    return <NoApprovedMemberships />;
  }

  return (
    <div className="flex flex-col gap-6">
      <CatalogueControls
        appliedSearch={appliedSearch}
        canCreateResources={membershipsState.memberships.some(
          (membership) => membership.role.toUpperCase() === "ADMIN",
        )}
        memberships={membershipsState.memberships}
        searchInput={searchInput}
        selectedOrganizationId={selectedOrganizationId}
        onClearSearch={clearSearch}
        onOrganizationChange={changeOrganization}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={applySearch}
      />
      <CatalogueResults
        appliedSearch={appliedSearch}
        catalogueState={catalogueState}
        memberships={membershipsState.memberships}
        selectedOrganizationId={selectedOrganizationId}
        onPageChange={changePage}
        onRetry={retryCatalogue}
      />
    </div>
  );
}

function CatalogueControls({
  appliedSearch,
  canCreateResources,
  memberships,
  searchInput,
  selectedOrganizationId,
  onClearSearch,
  onOrganizationChange,
  onSearchInputChange,
  onSearchSubmit,
}: {
  appliedSearch: string;
  canCreateResources: boolean;
  memberships: MembershipWithOrganization[];
  searchInput: string;
  selectedOrganizationId: string;
  onClearSearch: () => void;
  onOrganizationChange: (organizationId: string) => void;
  onSearchInputChange: (value: string) => void;
  onSearchSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const organizationLabels = Object.fromEntries(
    [
      [ALL_ORGANIZATIONS, "All organizations"],
      ...memberships.map((membership) => [
        membership.organizationId,
        membership.organization.name,
      ]),
    ],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search the catalogue</CardTitle>
        <CardDescription>
          Search every resource available through your approved organizations.
        </CardDescription>
        {canCreateResources ? (
          <CardAction>
            <Link
              className={buttonVariants()}
              href="/dashboard/resources/new"
            >
              <PlusIcon data-icon="inline-start" />
              Create resource
            </Link>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-5">
        <form className="space-y-2" onSubmit={onSearchSubmit}>
          <Label htmlFor="resource-search">Search resources</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="resource-search"
              value={searchInput}
              placeholder="Search by resource name"
              onChange={(event) => onSearchInputChange(event.target.value)}
            />
            <Button type="submit">
              <SearchIcon data-icon="inline-start" />
              Search
            </Button>
            {appliedSearch ? (
              <Button type="button" variant="outline" onClick={onClearSearch}>
                Clear
              </Button>
            ) : null}
          </div>
        </form>
        <div className="grid gap-2 border-t pt-5 md:grid-cols-2 md:items-end">
          <div>
            <Label htmlFor="resource-organization">Organization filter</Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Narrow the current search to one organization when needed.
            </p>
          </div>
          <Select
            items={organizationLabels}
            value={selectedOrganizationId}
            onValueChange={(value) => {
              if (typeof value === "string") {
                onOrganizationChange(value);
              }
            }}
          >
            <SelectTrigger
              id="resource-organization"
              className="w-full"
            >
              <SelectValue placeholder="Select an organization" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_ORGANIZATIONS}>
                All organizations
              </SelectItem>
              {memberships.map((membership) => (
                <SelectItem
                  key={membership.organizationId}
                  value={membership.organizationId}
                >
                  {membership.organization.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

function CatalogueResults({
  appliedSearch,
  catalogueState,
  memberships,
  selectedOrganizationId,
  onPageChange,
  onRetry,
}: {
  appliedSearch: string;
  catalogueState: CatalogueState;
  memberships: MembershipWithOrganization[];
  selectedOrganizationId: string;
  onPageChange: (page: number) => void;
  onRetry: () => void;
}) {
  if (
    catalogueState.status === "idle" ||
    catalogueState.status === "loading"
  ) {
    return <ResourceResultsSkeleton />;
  }

  if (catalogueState.status === "error") {
    return (
      <RequestErrorCard
        error={catalogueState.error}
        subject="Resources"
        onRetry={onRetry}
      />
    );
  }

  const { catalogue } = catalogueState;
  const membershipNames = new Map(
    memberships.map((membership) => [
      membership.organizationId,
      membership.organization.name,
    ]),
  );

  if (catalogue.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {appliedSearch
              ? "No matching resources"
              : "No resources available"}
          </CardTitle>
          <CardDescription>
            {appliedSearch
              ? `No resources matched “${appliedSearch}”. Try another name.`
              : selectedOrganizationId === ALL_ORGANIZATIONS
                ? "Your approved organizations do not have accessible resources yet."
                : "This organization does not have accessible resources yet."}
          </CardDescription>
        </CardHeader>
        {catalogue.page > 1 ? (
          <CardContent>
            <Button
              variant="outline"
              onClick={() => onPageChange(catalogue.page - 1)}
            >
              <ChevronLeftIcon data-icon="inline-start" />
              Previous page
            </Button>
          </CardContent>
        ) : null}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {catalogue.total}{" "}
          {catalogue.total === 1 ? "resource" : "resources"}
          {appliedSearch ? ` matching “${appliedSearch}”` : ""}
        </p>
        <p className="text-sm text-muted-foreground">
          Page {catalogue.page} of {catalogue.totalPages}
        </p>
      </div>
      <div className="shared-panel-grid *:data-[slot=card]:border-0 md:grid-cols-2 xl:grid-cols-3">
        {catalogue.data.map(({ accessOrganizationId, resource }) => (
          <ResourceCatalogueCard
            key={resource.id}
            accessOrganizationId={accessOrganizationId}
            accessOrganizationName={membershipNames.get(accessOrganizationId)}
            resource={resource}
          />
        ))}
      </div>
      <nav
        aria-label="Resource catalogue pagination"
        className="flex items-center justify-end gap-2"
      >
        <Button
          variant="outline"
          disabled={catalogue.page <= 1}
          onClick={() => onPageChange(catalogue.page - 1)}
        >
          <ChevronLeftIcon data-icon="inline-start" />
          Previous
        </Button>
        <Button
          variant="outline"
          disabled={
            catalogue.totalPages === 0 ||
            catalogue.page >= catalogue.totalPages
          }
          onClick={() => onPageChange(catalogue.page + 1)}
        >
          Next
          <ChevronRightIcon data-icon="inline-end" />
        </Button>
      </nav>
    </div>
  );
}

async function getCombinedCatalogue(
  organizationIds: string[],
  requestedPage: number,
  search: string,
  signal: AbortSignal,
): Promise<CataloguePage> {
  const organizationCatalogues = await Promise.all(
    organizationIds.map(async (organizationId) => {
      const firstPage = await getAccessibleResources(organizationId, {
        page: 1,
        limit: AGGREGATE_RESOURCE_PAGE_SIZE,
        search,
        signal,
      });
      const remainingPages = await Promise.all(
        Array.from(
          { length: Math.max(firstPage.totalPages - 1, 0) },
          (_, index) =>
            getAccessibleResources(organizationId, {
              page: index + 2,
              limit: AGGREGATE_RESOURCE_PAGE_SIZE,
              search,
              signal,
            }),
        ),
      );

      return [firstPage, ...remainingPages].flatMap((catalogue) =>
        catalogue.data.map((resource) => ({
          accessOrganizationId: organizationId,
          resource,
        })),
      );
    }),
  );
  const resourcesById = new Map<string, CatalogueResource>();

  for (const catalogueResource of organizationCatalogues.flat()) {
    if (!resourcesById.has(catalogueResource.resource.id)) {
      resourcesById.set(catalogueResource.resource.id, catalogueResource);
    }
  }

  const resources = [...resourcesById.values()].sort((first, second) =>
    first.resource.name.localeCompare(second.resource.name),
  );
  const total = resources.length;
  const totalPages = Math.ceil(total / RESOURCE_PAGE_SIZE);
  const page = Math.min(requestedPage, Math.max(totalPages, 1));
  const pageStart = (page - 1) * RESOURCE_PAGE_SIZE;

  return {
    data: resources.slice(pageStart, pageStart + RESOURCE_PAGE_SIZE),
    total,
    page,
    limit: RESOURCE_PAGE_SIZE,
    totalPages,
  };
}

function NoApprovedMemberships() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>No approved memberships</CardTitle>
        <CardDescription>
          You need an approved organization membership before you can browse
          its resources.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link
          className={buttonVariants({ variant: "outline" })}
          href="/dashboard/organizations"
        >
          Browse organizations
          <ArrowRightIcon data-icon="inline-end" />
        </Link>
      </CardContent>
    </Card>
  );
}

function ResourceCatalogueSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading resource catalogue"
      className="flex flex-col gap-6"
    >
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
      <ResourceResultsSkeleton />
    </div>
  );
}

function ResourceResultsSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading resources"
      className="shared-panel-grid *:data-[slot=card]:border-0 md:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: 3 }, (_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="grid gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
