"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";

import { MembershipStatusBadge } from "@/components/membership-status-badge";
import { RequestErrorCard } from "@/components/request-error-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
import {
  appointChildOrganizationAdministrator,
  approveOrganizationMembership,
  getChildOrganizationAdministrators,
  getOrganizationMembers,
  rejectOrganizationMembership,
  revokeChildOrganizationAdministrator,
} from "@/lib/resource-service/membership-api";
import {
  formatOrganizationDate,
  formatOrganizationLabel,
} from "@/lib/resource-service/organization-format";
import { getOrganizationDetails } from "@/lib/resource-service/organization-api";
import type {
  ChildOrganizationAdministrators,
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
      childAdministrators: ChildOrganizationAdministrators[];
    }
  | { status: "not-found" }
  | { status: "error"; error: unknown };

export function OrganizationMemberList({
  organizationId,
}: {
  organizationId: string;
}) {
  const router = useRouter();
  const [state, setState] = React.useState<MembersState>({ status: "loading" });
  const [requestAttempt, setRequestAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();

    getOrganizationDetails(organizationId, controller.signal)
      .then((organization) => {
        if (organization === null) {
          setState({ status: "not-found" });
          return null;
        }

        return Promise.all([
          Promise.resolve(organization),
          getOrganizationMembers(organizationId, controller.signal),
          organization.children.length > 0
            ? getChildOrganizationAdministrators(
                organizationId,
                controller.signal,
              )
            : Promise.resolve([] as ChildOrganizationAdministrators[]),
        ]);
      })
      .then((result) => {
        if (!result) return;
        const [organization, members, childAdministrators] = result;
        setState({
          status: "loaded",
          organization,
          members,
          childAdministrators,
        });
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;

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

  if (state.status === "loading") return <OrganizationMemberListSkeleton />;
  if (state.status === "error") {
    return (
      <RequestErrorCard
        error={state.error}
        subject="Organization members"
        onRetry={retryRequest}
      />
    );
  }
  if (state.status === "not-found") return <OrganizationNotFound />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow mb-3 text-clay">Organization administration</p>
        <h2 className="screen-title">{state.organization.name}</h2>
        <p className="screen-description">
          Review members and membership requests for this organization.
        </p>
      </div>
      <OrganizationMembersTable
        members={state.members}
        organizationName={state.organization.name}
        onChanged={retryRequest}
      />
      {state.childAdministrators.length > 0 ? (
        <ChildAdministratorPanel
          parentOrganizationId={state.organization.id}
          childAdministrators={state.childAdministrators}
          onChanged={retryRequest}
        />
      ) : null}
    </div>
  );
}

function OrganizationMembersTable({
  members,
  organizationName,
  onChanged,
}: {
  members: OrganizationMember[];
  organizationName: string;
  onChanged: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Members and requests</CardTitle>
        <CardDescription>
          Approve, reject, and review membership for this organization.
        </CardDescription>
        <CardAction>
          <Badge variant="secondary">
            {members.length} {members.length === 1 ? "record" : "records"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        {members.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">
            No membership records or pending requests yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
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
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { title: "Pending requests", statuses: ["PENDING"] },
                  { title: "Approved members", statuses: ["APPROVED"] },
                  { title: "Rejected and history", statuses: ["REJECTED", "SUSPENDED"] },
                ].map((section) => {
                  const sectionMembers = members.filter((member) =>
                    section.statuses.includes(member.status.toUpperCase()),
                  );
                  if (sectionMembers.length === 0) return null;
                  return (
                    <React.Fragment key={section.title}>
                      <TableRow>
                        <TableCell colSpan={6} className="bg-paper-alt py-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          {section.title} · {sectionMembers.length}
                        </TableCell>
                      </TableRow>
                      {sectionMembers.map((member) => (
                        <TableRow key={`${member.organizationId}:${member.userId}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>{memberInitials(member.user)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{memberName(member.user)}</p>
                                <p className="text-muted-foreground">{member.user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{formatOrganizationLabel(member.role)}</TableCell>
                          <TableCell>
                            <MembershipStatusBadge status={member.status} />
                            {member.reviewNote ? (
                              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                                {member.reviewNote}
                              </p>
                            ) : null}
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
                          <TableCell className="text-right">
                            {member.status === "PENDING" || member.status === "REJECTED" ? (
                              <MembershipDecisionDialog
                                member={member}
                                organizationName={organizationName}
                                onChanged={onChanged}
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MembershipDecisionDialog({
  member,
  organizationName,
  onChanged,
}: {
  member: OrganizationMember;
  organizationName: string;
  onChanged: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [decision, setDecision] = React.useState<"approve" | "reject">("approve");
  const [reason, setReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isReconsideration = member.status === "REJECTED";

  async function submit() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (decision === "approve") {
        await approveOrganizationMembership(member.organizationId, member.userId);
        toast.success(
          `${memberName(member.user)} ${isReconsideration ? "approved after reconsideration" : "approved"}.`,
        );
      } else {
        await rejectOrganizationMembership(
          member.organizationId,
          member.userId,
          reason,
        );
        toast.success(`${memberName(member.user)}'s request was rejected.`);
      }
      setOpen(false);
      onChanged();
    } catch (error) {
      if (error instanceof ApiAuthenticationError) {
        window.location.assign("/login");
        return;
      }
      if (error instanceof ApiError && error.status === 409) {
        toast.error(
          "This membership was already reviewed. The list has been refreshed.",
        );
        setOpen(false);
        onChanged();
        return;
      }
      toast.error(error instanceof Error ? error.message : "Membership action failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex justify-end gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setDecision("approve");
          setOpen(true);
        }}
      >
        {isReconsideration ? "Reconsider" : "Approve"}
      </Button>
      {!isReconsideration ? (
        <Button
          size="sm"
          variant="destructive"
          onClick={() => {
            setDecision("reject");
            setReason("");
            setOpen(true);
          }}
        >
          Reject
        </Button>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision === "approve"
                ? isReconsideration
                  ? "Reconsider membership request"
                  : "Approve membership request"
                : "Reject membership request"}
            </DialogTitle>
            <DialogDescription>
              {memberName(member.user)} requested access to {organizationName}.
              {decision === "approve"
                ? " Confirming gives the user approved organization access."
                : " Rejection is final for self-service requests."}
            </DialogDescription>
          </DialogHeader>
          {decision === "reject" ? (
            <Field>
              <FieldLabel htmlFor={`rejection-reason-${member.userId}`}>
                Reason <span className="text-muted-foreground">(optional)</span>
              </FieldLabel>
              <Textarea
                id={`rejection-reason-${member.userId}`}
                maxLength={500}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Explain how the applicant can contact the organization administrator."
              />
            </Field>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={decision === "reject" ? "destructive" : "default"}
              disabled={isSubmitting}
              onClick={() => void submit()}
            >
              {isSubmitting ? (
                <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
              ) : null}
              {isSubmitting
                ? "Saving..."
                : decision === "reject"
                  ? "Confirm rejection"
                  : "Confirm approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChildAdministratorPanel({
  parentOrganizationId,
  childAdministrators,
  onChanged,
}: {
  parentOrganizationId: string;
  childAdministrators: ChildOrganizationAdministrators[];
  onChanged: () => void;
}) {
  const [revokeTarget, setRevokeTarget] = React.useState<{
    childId: string;
    childName: string;
    userId: string;
    userName: string;
  } | null>(null);
  const [isRevoking, setIsRevoking] = React.useState(false);

  async function confirmRevoke() {
    if (!revokeTarget || isRevoking) return;
    setIsRevoking(true);
    try {
      await revokeChildOrganizationAdministrator(
        parentOrganizationId,
        revokeTarget.childId,
        revokeTarget.userId,
      );
      toast.success("Child administrator revoked.");
      setRevokeTarget(null);
      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to revoke administrator.",
      );
    } finally {
      setIsRevoking(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Child organization administrators</CardTitle>
          <CardDescription>
            Appoint administrators for immediate child organizations. They must
            already have a pending or approved membership there.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {childAdministrators.map((child) => (
            <div key={child.id} className="border border-line p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{child.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatOrganizationLabel(child.type)}
                  </p>
                </div>
                <AppointChildAdministratorDialog
                  parentOrganizationId={parentOrganizationId}
                  child={child}
                  onChanged={onChanged}
                />
              </div>
              <div className="mt-3 grid gap-2">
                {child.administrators.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No administrator appointed yet.
                  </p>
                ) : (
                  child.administrators.map((administrator) => {
                    const userName = `${administrator.user.firstName} ${administrator.user.lastName}`.trim();
                    return (
                      <div
                        key={administrator.userId}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm"
                      >
                        <span>
                          {userName === administrator.user.email
                            ? userName
                            : `${userName} · ${administrator.user.email}`}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isRevoking}
                          onClick={() =>
                            setRevokeTarget({
                              childId: child.id,
                              childName: child.name,
                              userId: administrator.userId,
                              userName: userName || administrator.user.email,
                            })
                          }
                        >
                          Revoke
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Dialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isRevoking) setRevokeTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke child administrator?</DialogTitle>
            <DialogDescription>
              {revokeTarget?.userName} will remain a member of {revokeTarget?.childName}
              but will no longer administer it. The last administrator cannot be
              revoked.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={isRevoking}
              onClick={() => setRevokeTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isRevoking}
              onClick={() => void confirmRevoke()}
            >
              {isRevoking ? "Revoking..." : "Revoke administrator"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AppointChildAdministratorDialog({
  parentOrganizationId,
  child,
  onChanged,
}: {
  parentOrganizationId: string;
  child: ChildOrganizationAdministrators;
  onChanged: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await appointChildOrganizationAdministrator(
        parentOrganizationId,
        child.id,
        email,
      );
      toast.success("Child administrator appointed.");
      setOpen(false);
      setEmail("");
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to appoint administrator.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Appoint administrator
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appoint {child.name} administrator</DialogTitle>
            <DialogDescription>
              Enter the email of an active user who has already requested or
              holds membership in this organization.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-5" onSubmit={submit}>
            <Field>
              <FieldLabel htmlFor={`child-admin-email-${child.id}`}>
                User email
              </FieldLabel>
              <input
                id={`child-admin-email-${child.id}`}
                className="h-10 border border-line bg-paper-alt px-3 text-sm outline-none focus:border-ink"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Appointing..." : "Appoint administrator"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
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
        <Button variant="outline" render={<Link href="/dashboard/organizations" />}>
          <ArrowLeftIcon data-icon="inline-start" />
          Back to organizations
        </Button>
      </CardContent>
    </Card>
  );
}

function OrganizationMemberListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading organization members" className="flex flex-col gap-6">
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

function accountStatusVariant(status: string): "success" | "destructive" | "outline" {
  const normalizedStatus = status.toUpperCase();
  if (normalizedStatus === "ACTIVE") return "success";
  if (normalizedStatus === "SUSPENDED") return "destructive";
  return "outline";
}
