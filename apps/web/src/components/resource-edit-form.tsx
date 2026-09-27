"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, CheckCircle2Icon, UploadIcon, XIcon } from "lucide-react";

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
  getRootOrganizationDescendants,
} from "@/lib/resource-service/organization-api";
import {
  getResourceDetails,
  updateResource,
  uploadResourceImage,
} from "@/lib/resource-service/resource-api";
import type { Organization, ResourceDetails } from "@/lib/resource-service/types";

type EditState =
  | { status: "loading" }
  | { status: "loaded"; resource: ResourceDetails | null; tenantOrganizations: Organization[]; isAuthorized: boolean }
  | { status: "error"; error: unknown };

export function ResourceEditForm({
  organizationId,
  resourceId,
}: {
  organizationId: string;
  resourceId: string;
}) {
  const router = useRouter();
  const [editState, setEditState] = React.useState<EditState>({
    status: "loading",
  });
  const [requestAttempt, setRequestAttempt] = React.useState(0);
  
  const [allowedOrganizationIds, setAllowedOrganizationIds] = React.useState<string[]>([]);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [pointCost, setPointCost] = React.useState("0");
  const [cancellationMinutes, setCancellationMinutes] = React.useState("0");
  const [cancellationHours, setCancellationHours] = React.useState("0");
  const [cancellationDays, setCancellationDays] = React.useState("0");
  const [cancellationWeeks, setCancellationWeeks] = React.useState("0");
  const [status, setStatus] = React.useState("ACTIVE");
  
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [isSuccess, setIsSuccess] = React.useState(false);

  React.useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      const memberships = await getCurrentUserMemberships(controller.signal);
      
      const adminMemberships = memberships.filter(
        (membership) =>
          membership.organizationId === organizationId &&
          membership.status.toUpperCase() === "APPROVED" &&
          membership.role.toUpperCase() === "ADMIN",
      );
      
      if (adminMemberships.length === 0) {
        setEditState({ status: "loaded", resource: null, tenantOrganizations: [], isAuthorized: false });
        return;
      }
      
      const resource = await getResourceDetails(organizationId, resourceId, controller.signal);
      const rootOrganizationId = resource.ownerOrganization.rootOrganizationId;
      
      const descendants = await getRootOrganizationDescendants(rootOrganizationId, controller.signal);
      
      const tenantOrganizations = uniqueOrganizations([resource.ownerOrganization, ...descendants]);

      setEditState({ status: "loaded", resource, tenantOrganizations, isAuthorized: true });
      
      setName(resource.name);
      setDescription(resource.description || "");
      setPointCost(String(resource.pointCost));
      setStatus(resource.status);
      setAllowedOrganizationIds(resource.allowedOrganizations.map(org => org.organizationId));
      if (resource.imageUrl) {
        setImagePreview(resource.imageUrl);
      }
      
      // Calculate times
      let remainingMinutes = resource.cancellationNoticeMinutes;
      const weeks = Math.floor(remainingMinutes / (60 * 24 * 7));
      remainingMinutes -= weeks * 60 * 24 * 7;
      const days = Math.floor(remainingMinutes / (60 * 24));
      remainingMinutes -= days * 60 * 24;
      const hours = Math.floor(remainingMinutes / 60);
      remainingMinutes -= hours * 60;
      const minutes = remainingMinutes;
      
      setCancellationWeeks(String(weeks));
      setCancellationDays(String(days));
      setCancellationHours(String(hours));
      setCancellationMinutes(String(minutes));
    }

    loadData().catch((requestError: unknown) => {
      if (controller.signal.aborted) {
        return;
      }

      setEditState({ status: "error", error: requestError });

      if (requestError instanceof ApiAuthenticationError) {
        router.replace("/login");
        router.refresh();
      }
    });

    return () => controller.abort();
  }, [requestAttempt, router, organizationId, resourceId]);

  function changeAllowedOrganization(
    orgId: string,
    checked: boolean,
  ) {
    if (orgId === organizationId) {
      return;
    }

    setAllowedOrganizationIds((currentIds) =>
      checked
        ? [...new Set([...currentIds, orgId])]
        : currentIds.filter((id) => id !== orgId),
    );
  }

  async function submitUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const normalizedName = name.trim();
    const numericPointCost = Number(pointCost);
    const numericCancellationNoticeMinutes = totalCancellationNoticeMinutes({
      minutes: cancellationMinutes,
      hours: cancellationHours,
      days: cancellationDays,
      weeks: cancellationWeeks,
    });

    if (!normalizedName) {
      setFormError("Resource name is required.");
      return;
    }

    if (!Number.isInteger(numericPointCost) || numericPointCost < 0) {
      setFormError("Point cost must be a non-negative whole number.");
      return;
    }

    if (numericCancellationNoticeMinutes === null) {
      setFormError(
        "Cancellation notice must be non-negative whole numbers.",
      );
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      await updateResource(organizationId, resourceId, {
        name: normalizedName,
        description,
        pointCost: numericPointCost,
        cancellationNoticeMinutes: numericCancellationNoticeMinutes,
        allowedOrganizationIds,
        status,
      });
      
      if (imageFile) {
        await uploadResourceImage(organizationId, resourceId, imageFile);
      }
      
      setIsSuccess(true);
      router.refresh();
    } catch (requestError) {
      if (requestError instanceof ApiAuthenticationError) {
        router.replace("/login");
        router.refresh();
        return;
      }

      setFormError(resourceEditErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (editState.status === "loading") {
    return <ResourceEditSkeleton />;
  }

  if (editState.status === "error") {
    return (
      <RequestErrorCard
        error={editState.error}
        subject="Resource details"
        onRetry={() => {
          setEditState({ status: "loading" });
          setRequestAttempt((attempt) => attempt + 1);
        }}
      />
    );
  }

  if (!editState.isAuthorized) {
    return <NoResourceEditAccess />;
  }
  
  if (isSuccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2Icon className="size-4 text-green-500" />
            Resource updated
          </CardTitle>
          <CardDescription>
            The resource has been successfully updated.
          </CardDescription>
        </CardHeader>
        <CardFooter className="gap-2">
          <Button
            nativeButton={false}
            render={<Link href={`/dashboard/resources/${resourceId}?organization=${organizationId}`} />}
          >
            Back to resource
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const allowedOrganizations = editState.tenantOrganizations.sort(compareOrganizations);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit resource</CardTitle>
        <CardDescription>
          Update the resource details and which organizations can access it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submitUpdate} aria-busy={isSubmitting}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="resource-name">
                Resource name
                <span className="text-destructive" aria-hidden="true">*</span>
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
              <FieldLabel htmlFor="resource-status">Status</FieldLabel>
              <Select value={status} onValueChange={(val) => val && setStatus(val)}>
                <SelectTrigger id="resource-status" className="w-full">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="resource-image">
                Resource Image
              </FieldLabel>
              <div
                className="relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-line bg-paper-alt p-6 transition-colors hover:bg-line/50 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                onClick={() => document.getElementById("resource-image")?.click()}
              >
                {imagePreview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-h-48 rounded-md object-contain"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute right-2 top-2 h-8 w-8 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageFile(null);
                        setImagePreview(null);
                        const input = document.getElementById("resource-image") as HTMLInputElement;
                        if (input) input.value = "";
                      }}
                    >
                      <XIcon className="h-4 w-4" />
                      <span className="sr-only">Remove image</span>
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <UploadIcon className="h-8 w-8" />
                    <span className="text-sm font-medium">
                      Click to upload an image
                    </span>
                    <span className="text-xs">PNG, JPG, or WEBP</span>
                  </div>
                )}
                <input
                  id="resource-image"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      setImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                    } else {
                      setImageFile(null);
                      setImagePreview(null);
                    }
                  }}
                />
              </div>
            </Field>

            <Field>
              <FieldLabel htmlFor="resource-point-cost">
                Point cost
                <span className="text-destructive" aria-hidden="true">*</span>
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
            </Field>

            <FieldSet>
              <FieldLegend>Cancellation notice</FieldLegend>
              <FieldDescription>
                How long before a slot starts a member must cancel to
                receive a refund. Use 0 in every box to allow cancellation up
                until the slot starts.
              </FieldDescription>
              <div className="grid grid-cols-4 gap-2">
                <Field>
                  <FieldLabel htmlFor="resource-cancellation-minutes">Minutes</FieldLabel>
                  <Input
                    id="resource-cancellation-minutes"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={cancellationMinutes}
                    onChange={(event) => setCancellationMinutes(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="resource-cancellation-hours">Hours</FieldLabel>
                  <Input
                    id="resource-cancellation-hours"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={cancellationHours}
                    onChange={(event) => setCancellationHours(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="resource-cancellation-days">Days</FieldLabel>
                  <Input
                    id="resource-cancellation-days"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={cancellationDays}
                    onChange={(event) => setCancellationDays(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="resource-cancellation-weeks">Weeks</FieldLabel>
                  <Input
                    id="resource-cancellation-weeks"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={cancellationWeeks}
                    onChange={(event) => setCancellationWeeks(event.target.value)}
                  />
                </Field>
              </div>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Allowed organizations</FieldLegend>
              <FieldDescription>
                The owner is always included. Select any additional
                organizations that may access this resource.
              </FieldDescription>
              <FieldGroup data-slot="checkbox-group">
                {allowedOrganizations.map((org) => {
                  const isOwner = org.id === organizationId;
                  const checkboxId = `allowed-organization-${org.id}`;

                  return (
                    <Field key={org.id} orientation="horizontal">
                      <Checkbox
                        id={checkboxId}
                        checked={isOwner || allowedOrganizationIds.includes(org.id)}
                        disabled={isOwner || isSubmitting}
                        onCheckedChange={(checked) =>
                          changeAllowedOrganization(org.id, checked)
                        }
                      />
                      <FieldLabel htmlFor={checkboxId}>
                        {org.name}
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
                  {isSubmitting ? "Updating..." : "Update resource"}
                </Button>
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href={`/dashboard/resources/${resourceId}?organization=${organizationId}`} />}
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

function uniqueOrganizations(organizations: Organization[]): Organization[] {
  return [
    ...new Map(
      organizations.map((organization) => [organization.id, organization]),
    ).values(),
  ];
}

function totalCancellationNoticeMinutes({
  minutes,
  hours,
  days,
  weeks,
}: {
  minutes: string;
  hours: string;
  days: string;
  weeks: string;
}): number | null {
  const parts = [
    { value: minutes, multiplier: 1 },
    { value: hours, multiplier: 60 },
    { value: days, multiplier: 60 * 24 },
    { value: weeks, multiplier: 60 * 24 * 7 },
  ];

  let total = 0;
  for (const part of parts) {
    const numericValue = Number(part.value);
    if (!Number.isInteger(numericValue) || numericValue < 0) {
      return null;
    }
    total += numericValue * part.multiplier;
  }

  return total;
}

function compareOrganizations(
  first: Organization,
  second: Organization,
): number {
  return first.name.localeCompare(second.name);
}

function resourceEditErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) {
    return "You do not have permission to edit this resource.";
  }

  if (error instanceof ApiError && error.status === 400) {
    return error.message;
  }

  if (error instanceof ApiNetworkError) {
    return "ResourceHive could not be reached. Check that the API gateway is running.";
  }

  return "The resource could not be updated. Please try again.";
}

function NoResourceEditAccess() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resource edit unavailable</CardTitle>
        <CardDescription>
          You need an approved administrator membership to edit this resource.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button
          variant="outline"
          nativeButton={false}
          onClick={() => window.history.back()}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Go back
        </Button>
      </CardFooter>
    </Card>
  );
}

function ResourceEditSkeleton() {
  return (
    <Card aria-busy="true" aria-label="Loading resource edit form">
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
