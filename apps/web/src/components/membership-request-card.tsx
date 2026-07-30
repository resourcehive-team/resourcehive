"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CircleAlertIcon,
  CircleCheckIcon,
  LoaderCircleIcon,
} from "lucide-react";

import { MembershipStatusBadge } from "@/components/membership-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ApiAuthenticationError,
  ApiError,
  ApiNetworkError,
} from "@/lib/api-client";
import { requestOrganizationMembership } from "@/lib/resource-service/membership-api";
import type { Membership } from "@/lib/resource-service/types";

type RequestState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; membership: Membership }
  | { status: "error"; error: unknown };

export function MembershipRequestCard({
  organizationId,
  organizationName,
}: {
  organizationId: string;
  organizationName: string;
}) {
  const router = useRouter();
  const requestController = React.useRef<AbortController>(null);
  const [state, setState] = React.useState<RequestState>({ status: "idle" });

  React.useEffect(() => {
    return () => requestController.current?.abort();
  }, []);

  async function submitRequest() {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setState({ status: "submitting" });

    try {
      const membership = await requestOrganizationMembership(
        organizationId,
        controller.signal,
      );

      if (!controller.signal.aborted) {
        setState({ status: "success", membership });
      }
    } catch (requestError) {
      if (controller.signal.aborted) {
        return;
      }

      setState({ status: "error", error: requestError });

      if (requestError instanceof ApiAuthenticationError) {
        router.replace("/login");
        router.refresh();
      }
    }
  }

  const feedback =
    state.status === "error" ? getRequestError(state.error) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request membership</CardTitle>
        <CardDescription>
          Ask to join {organizationName}. An organization administrator must
          approve your request.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.status === "success" ? (
          <div
            aria-live="polite"
            className="flex items-start gap-3 rounded-lg border p-3"
          >
            <CircleCheckIcon className="mt-0.5 size-4 text-primary" />
            <div className="space-y-1">
              <p className="font-medium">Membership request submitted</p>
              <p className="text-sm text-muted-foreground">
                Your request is waiting for an organization administrator.
              </p>
              <MembershipStatusBadge status={state.membership.status} />
            </div>
          </div>
        ) : null}

        {feedback ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border p-3"
          >
            <CircleAlertIcon className="mt-0.5 size-4 text-destructive" />
            <div className="space-y-1">
              <p className="font-medium">{feedback.title}</p>
              <p className="text-sm text-muted-foreground">
                {feedback.description}
              </p>
            </div>
          </div>
        ) : null}

        {state.status === "idle" ||
        state.status === "submitting" ||
        (state.status === "error" && feedback?.canRetry) ? (
          <Button
            disabled={state.status === "submitting"}
            onClick={() => void submitRequest()}
          >
            {state.status === "submitting" ? (
              <LoaderCircleIcon
                aria-hidden="true"
                className="animate-spin"
                data-icon="inline-start"
              />
            ) : null}
            {state.status === "submitting"
              ? "Submitting request"
              : state.status === "error"
                ? "Try request again"
                : "Request membership"}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function getRequestError(error: unknown): {
  title: string;
  description: string;
  canRetry: boolean;
} {
  if (error instanceof ApiAuthenticationError) {
    return {
      title: "Your session has expired",
      description: "Redirecting you to the login page.",
      canRetry: false,
    };
  }

  if (error instanceof ApiError && error.status === 409) {
    return {
      title: "Membership already exists",
      description:
        "You already have a membership or membership request for this organization.",
      canRetry: false,
    };
  }

  if (error instanceof ApiError && error.status === 403) {
    return {
      title: "Membership request not allowed",
      description:
        "Your account is not allowed to request membership in this organization.",
      canRetry: false,
    };
  }

  if (error instanceof ApiError && error.status === 400) {
    return {
      title: "Membership request is invalid",
      description:
        "The organization could not accept this request. Check the organization and try again.",
      canRetry: false,
    };
  }

  if (error instanceof ApiNetworkError) {
    return {
      title: "ResourceHive could not be reached",
      description:
        "Check your connection and make sure the API gateway is running.",
      canRetry: true,
    };
  }

  return {
    title: "Membership request failed",
    description: "Please try again. If the problem continues, contact support.",
    canRetry: true,
  };
}
