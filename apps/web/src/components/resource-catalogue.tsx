"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
} from "lucide-react";

import { RequestErrorCard } from "@/components/request-error-card";
import { ResourceCatalogueCard } from "@/components/resource-catalogue-card";
import { Button } from "@/components/ui/button";
import {
  Card,
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
  | { status: "loaded"; catalogue: PaginatedResources }
  | { status: "error"; error: unknown };

export function ResourceCatalogue() {
  const router = useRouter();
  const [membershipsState, setMembershipsState] =
    React.useState<MembershipsState>({ status: "loading" });
  const [membershipsAttempt, setMembershipsAttempt] = React.useState(0);
  const [selectedOrganizationId, setSelectedOrganizationId] = React.useState<
    string | null
  >(null);
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
        setSelectedOrganizationId((currentOrganizationId) => {
          if (
            currentOrganizationId &&
            approvedMemberships.some(
              (membership) =>
                membership.organizationId === currentOrganizationId,
            )
          ) {
            return currentOrganizationId;
          }

          return approvedMemberships[0]?.organizationId ?? null;
        });

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
    if (!selectedOrganizationId) {
      return;
    }

    const controller = new AbortController();

    getAccessibleResources(selectedOrganizationId, {
      page,
      limit: RESOURCE_PAGE_SIZE,
      search: appliedSearch,
      signal: controller.signal,
    })
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

  if (!selectedOrganizationId) {
    return <ResourceCatalogueSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6">
      <CatalogueControls
        appliedSearch={appliedSearch}
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
        selectedOrganizationId={selectedOrganizationId}
        onPageChange={changePage}
        onRetry={retryCatalogue}
      />
    </div>
  );
}

function CatalogueControls({
  appliedSearch,
  memberships,
  searchInput,
  selectedOrganizationId,
  onClearSearch,
  onOrganizationChange,
  onSearchInputChange,
  onSearchSubmit,
}: {
  appliedSearch: string;
  memberships: MembershipWithOrganization[];
  searchInput: string;
  selectedOrganizationId: string;
  onClearSearch: () => void;
  onOrganizationChange: (organizationId: string) => void;
  onSearchInputChange: (value: string) => void;
  onSearchSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const organizationLabels = Object.fromEntries(
    memberships.map((membership) => [
      membership.organizationId,
      membership.organization.name,
    ]),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Catalogue filters</CardTitle>
        <CardDescription>
          Choose one of your approved organizations and search by resource
          name.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="resource-organization">Organization</Label>
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
        <form className="space-y-2" onSubmit={onSearchSubmit}>
          <Label htmlFor="resource-search">Resource name</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="resource-search"
              value={searchInput}
              placeholder="Search resources"
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
      </CardContent>
    </Card>
  );
}

function CatalogueResults({
  appliedSearch,
  catalogueState,
  selectedOrganizationId,
  onPageChange,
  onRetry,
}: {
  appliedSearch: string;
  catalogueState: CatalogueState;
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {catalogue.data.map((resource) => (
          <ResourceCatalogueCard
            key={resource.id}
            resource={resource}
            selectedOrganizationId={selectedOrganizationId}
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
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
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
