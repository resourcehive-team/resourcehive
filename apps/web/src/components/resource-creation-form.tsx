"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, CheckCircle2Icon, PlusIcon } from "lucide-react";

import { RequestErrorCard } from "@/components/request-error-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  ApiAuthenticationError,
  ApiError,
  ApiNetworkError,
} from "@/lib/api-client";
import { getCurrentUserMemberships } from "@/lib/resource-service/membership-api";
import {
  getOrganizationDetails,
  getRootOrganizationDescendants,
} from "@/lib/resource-service/organization-api";
import { createResource } from "@/lib/resource-service/resource-api";
import type {
  Organization,
  Resource,
} from "@/lib/resource-service/types";

type ResourceCreationAccess = {
  ownerOrganizations: Organization[];
  tenantOrganizations: Organization[];
};

type AccessState =
  | { status: "loading" }
  | { status: "loaded"; access: ResourceCreationAccess }
  | { status: "error"; error: unknown };

export function ResourceCreationForm() {
  const router = useRouter();
  const [accessState, setAccessState] = React.useState<AccessState>({
    status: "loading",
  });
  const [requestAttempt, setRequestAttempt] = React.useState(0);
  const [ownerOrganizationId, setOwnerOrganizationId] = React.useState("");
  const [allowedOrganizationIds, setAllowedOrganizationIds] = React.useState<
    string[]
  >([]);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [pointCost, setPointCost] = React.useState("0");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [createdResource, setCreatedResource] = React.useState<Resource | null>(
    null,
  );

  React.useEffect(() => {
    const controller = new AbortController();

    loadResourceCreationAccess(controller.signal)
      .then((access) => {
        setAccessState({ status: "loaded", access });
        const firstOwnerId = access.ownerOrganizations[0]?.id ?? "";
        setOwnerOrganizationId(firstOwnerId);
        setAllowedOrganizationIds(firstOwnerId ? [firstOwnerId] : []);
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setAccessState({ status: "error", error: requestError });

        if (requestError instanceof ApiAuthenticationError) {
          router.replace("/login");
          router.refresh();
        }
      });

    return () => controller.abort();
  }, [requestAttempt, router]);

  function retryAccessRequest() {
    setAccessState({ status: "loading" });
    setRequestAttempt((attempt) => attempt + 1);
  }

  function changeOwner(organizationId: string) {
    setOwnerOrganizationId(organizationId);
    setAllowedOrganizationIds([organizationId]);
    setCreatedResource(null);
    setFormError("");
  }

  function changeAllowedOrganization(
    organizationId: string,
    checked: boolean,
  ) {
    if (organizationId === ownerOrganizationId) {
      return;
    }

    setAllowedOrganizationIds((currentIds) =>
      checked
        ? [...new Set([...currentIds, organizationId])]
        : currentIds.filter((id) => id !== organizationId),
    );
  }

  async function submitResource(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const normalizedName = name.trim();
    const numericPointCost = Number(pointCost);

    if (!normalizedName) {
      setFormError("Resource name is required.");
      return;
    }

    if (!Number.isInteger(numericPointCost) || numericPointCost < 0) {
      setFormError("Point cost must be a non-negative whole number.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      const resource = await createResource(ownerOrganizationId, {
        name: normalizedName,
        description,
        pointCost: numericPointCost,
        allowedOrganizationIds,
      });
      setCreatedResource(resource);
    } catch (requestError) {
      if (requestError instanceof ApiAuthenticationError) {
        router.replace("/login");
        router.refresh();
        return;
      }

      setFormError(resourceCreationErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function createAnotherResource() {
    setName("");
    setDescription("");
    setPointCost("0");
    setAllowedOrganizationIds(
      ownerOrganizationId ? [ownerOrganizationId] : [],
    );
    setFormError("");
    setCreatedResource(null);
  }

  if (accessState.status === "loading") {
    return <ResourceCreationSkeleton />;
  }

  if (accessState.status === "error") {
    return (
      <RequestErrorCard
        error={accessState.error}
        subject="Resource creation access"
        onRetry={retryAccessRequest}
      />
    );
  }

  if (accessState.access.ownerOrganizations.length === 0) {
    return <NoResourceCreationAccess />;
  }

  const selectedOwner = accessState.access.ownerOrganizations.find(
    (organization) => organization.id === ownerOrganizationId,
  );
  const allowedOrganizations = accessState.access.tenantOrganizations
    .filter(
      (organization) =>
        organization.rootOrganizationId ===
        selectedOwner?.rootOrganizationId,
    )
    .sort(compareOrganizations);

  if (createdResource) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2Icon className="size-4" />
            Resource created
          </CardTitle>
          <CardDescription>
            {createdResource.name} is now available according to its selected
            organization access.
          </CardDescription>
        </CardHeader>
        <CardFooter className="gap-2">
          <Button render={<Link href="/dashboard/resources" />}>
            Back to catalogue
          </Button>
          <Button variant="outline" onClick={createAnotherResource}>
            <PlusIcon data-icon="inline-start" />
            Create another
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const ownerLabels = Object.fromEntries(
    accessState.access.ownerOrganizations.map((organization) => [
      organization.id,
      organization.name,
    ]),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create resource</CardTitle>
        <CardDescription>
          Add a resource and choose which organizations in its tenant may use
          it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-xs text-muted-foreground">
          <span className="text-destructive" aria-hidden="true">
            *
          </span>{" "}
          Required fields
        </p>
        <form onSubmit={submitResource} aria-busy={isSubmitting}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="resource-name">
                Resource name
                <span className="text-destructive" aria-hidden="true">
                  *
                </span>
              </FieldLabel>
              <Input
                id="resource-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="resource-description">
                Description
              </FieldLabel>
              <Textarea
                id="resource-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What is this resource used for?"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="resource-point-cost">
                Point cost
                <span className="text-destructive" aria-hidden="true">
                  *
                </span>
              </FieldLabel>
              <Input
                id="resource-point-cost"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={pointCost}
                onChange={(event) => setPointCost(event.target.value)}
                required
              />
              <FieldDescription>
                The points deducted when a member books this resource.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="resource-owner">
                Owner organization
                <span className="text-destructive" aria-hidden="true">
                  *
                </span>
              </FieldLabel>
              <Select
                items={ownerLabels}
                value={ownerOrganizationId}
                onValueChange={(value) => {
                  if (typeof value === "string") {
                    changeOwner(value);
                  }
                }}
              >
                <SelectTrigger id="resource-owner" className="w-full">
                  <SelectValue placeholder="Select an owner organization" />
                </SelectTrigger>
                <SelectContent>
                  {accessState.access.ownerOrganizations.map((organization) => (
                    <SelectItem key={organization.id} value={organization.id}>
                      {organization.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                Only organizations you administer are available as owners.
              </FieldDescription>
            </Field>

            <FieldSet>
              <FieldLegend>Allowed organizations</FieldLegend>
              <FieldDescription>
                The owner is always included. Select any additional
                organizations that may access this resource.
              </FieldDescription>
              <FieldGroup data-slot="checkbox-group">
                {allowedOrganizations.map((organization) => {
                  const isOwner = organization.id === ownerOrganizationId;
                  const checkboxId = `allowed-organization-${organization.id}`;

                  return (
                    <Field key={organization.id} orientation="horizontal">
                      <Checkbox
                        id={checkboxId}
                        checked={
                          isOwner ||
                          allowedOrganizationIds.includes(organization.id)
                        }
                        disabled={isOwner || isSubmitting}
                        onCheckedChange={(checked) =>
                          changeAllowedOrganization(organization.id, checked)
                        }
                      />
                      <FieldLabel htmlFor={checkboxId}>
                        {organization.name}
                        {isOwner ? " (owner)" : ""}
                      </FieldLabel>
                    </Field>
                  );
                })}
              </FieldGroup>
            </FieldSet>

            <Field data-invalid={formError ? "true" : undefined}>
              <FieldError>{formError}</FieldError>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating resource..." : "Create resource"}
                </Button>
                <Button
                  variant="outline"
                  render={<Link href="/dashboard/resources" />}
                >
                  <ArrowLeftIcon data-icon="inline-start" />
                  Cancel
                </Button>
              </div>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

async function loadResourceCreationAccess(
  signal: AbortSignal,
): Promise<ResourceCreationAccess> {
  const memberships = await getCurrentUserMemberships(signal);
  const adminMemberships = memberships.filter(
    (membership) =>
      membership.status.toUpperCase() === "APPROVED" &&
      membership.role.toUpperCase() === "ADMIN",
  );

  if (adminMemberships.length === 0) {
    return { ownerOrganizations: [], tenantOrganizations: [] };
  }

  const rootIds = [
    ...new Set(
      adminMemberships.map(
        (membership) => membership.organization.rootOrganizationId,
      ),
    ),
  ];
  const tenantOrganizationGroups = await Promise.all(
    rootIds.map(async (rootId) => {
      const [rootOrganization, descendants] = await Promise.all([
        getOrganizationDetails(rootId, signal),
        getRootOrganizationDescendants(rootId, signal),
      ]);

      if (!rootOrganization) {
        throw new Error("The tenant organization could not be found.");
      }

      return uniqueOrganizations([rootOrganization, ...descendants]);
    }),
  );
  const tenantOrganizations = uniqueOrganizations(
    tenantOrganizationGroups.flat(),
  );
  const adminOrganizationIds = new Set(
    adminMemberships.map((membership) => membership.organizationId),
  );
  const organizationsById = new Map(
    tenantOrganizations.map((organization) => [organization.id, organization]),
  );
  const ownerOrganizations = tenantOrganizations
    .filter((organization) =>
      isOrganizationManaged(
        organization,
        adminOrganizationIds,
        organizationsById,
      ),
    )
    .sort(compareOrganizations);

  return { ownerOrganizations, tenantOrganizations };
}

function isOrganizationManaged(
  organization: Organization,
  adminOrganizationIds: Set<string>,
  organizationsById: Map<string, Organization>,
): boolean {
  let currentOrganization: Organization | undefined = organization;
  const visitedOrganizationIds = new Set<string>();

  while (
    currentOrganization &&
    !visitedOrganizationIds.has(currentOrganization.id)
  ) {
    if (adminOrganizationIds.has(currentOrganization.id)) {
      return true;
    }

    visitedOrganizationIds.add(currentOrganization.id);
    currentOrganization = currentOrganization.parentId
      ? organizationsById.get(currentOrganization.parentId)
      : undefined;
  }

  return false;
}

function uniqueOrganizations(organizations: Organization[]): Organization[] {
  return [
    ...new Map(
      organizations.map((organization) => [organization.id, organization]),
    ).values(),
  ];
}

function compareOrganizations(
  first: Organization,
  second: Organization,
): number {
  return first.name.localeCompare(second.name);
}

function resourceCreationErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) {
    return "You do not have permission to create a resource for this organization.";
  }

  if (error instanceof ApiError && error.status === 400) {
    return error.message;
  }

  if (error instanceof ApiNetworkError) {
    return "ResourceHive could not be reached. Check that the API gateway is running.";
  }

  return "The resource could not be created. Please try again.";
}

function NoResourceCreationAccess() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resource creation unavailable</CardTitle>
        <CardDescription>
          You need an approved administrator membership to create resources.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button variant="outline" render={<Link href="/dashboard/resources" />}>
          <ArrowLeftIcon data-icon="inline-start" />
          Back to catalogue
        </Button>
      </CardFooter>
    </Card>
  );
}

function ResourceCreationSkeleton() {
  return (
    <Card aria-busy="true" aria-label="Loading resource creation form">
      <CardHeader>
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </CardHeader>
      <CardContent className="grid gap-5">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-20 w-full" />
      </CardContent>
    </Card>
  );
}
