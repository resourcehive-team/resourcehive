"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { MyDisputes } from "@/components/my-disputes";
import { OrganizationDisputes } from "@/components/organization-disputes";
import { RequestErrorCard } from "@/components/request-error-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiAuthenticationError } from "@/lib/api-client";
import { AuthenticationRequiredError, getCurrentUser } from "@/lib/auth-api";
import { getOrganizationDetails } from "@/lib/resource-service/organization-api";

type State =
  | { status: "loading" }
  | { status: "loaded"; canOpenDisputes: boolean; canManageDisputes: boolean }
  | { status: "error"; error: unknown };

export function DisputeSections() {
  const router = useRouter();
  const [state, setState] = React.useState<State>({ status: "loading" });
  const [requestAttempt, setRequestAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();

    (async () => {
      const account = await getCurrentUser(controller.signal);
      const isOrgAdmin =
        account.organizationContext.role?.toUpperCase() === "ADMIN";

      let isTenantAdmin = false;
      if (isOrgAdmin && account.organizationContext.organizationId) {
        const organization = await getOrganizationDetails(
          account.organizationContext.organizationId,
          controller.signal,
        );
        isTenantAdmin = organization?.parentId === null;
      }

      setState({
        status: "loaded",
        canOpenDisputes: !isTenantAdmin,
        canManageDisputes: isOrgAdmin,
      });
    })().catch((requestError: unknown) => {
      if (controller.signal.aborted) {
        return;
      }

      setState({ status: "error", error: requestError });

      if (
        requestError instanceof AuthenticationRequiredError ||
        requestError instanceof ApiAuthenticationError
      ) {
        router.replace("/login");
        router.refresh();
      }
    });

    return () => controller.abort();
  }, [requestAttempt, router]);

  if (state.status === "loading") {
    return (
      <Skeleton
        aria-label="Loading disputes"
        aria-busy="true"
        className="h-64 w-full rounded-none"
      />
    );
  }

  if (state.status === "error") {
    return (
      <RequestErrorCard
        error={state.error}
        subject="Disputes"
        onRetry={() => {
          setState({ status: "loading" });
          setRequestAttempt((attempt) => attempt + 1);
        }}
      />
    );
  }

  return (
    <div className="grid gap-10">
      {state.canOpenDisputes ? <MyDisputes /> : null}

      {state.canManageDisputes ? (
        <div>
          <p className="eyebrow text-clay">Resource providers</p>
          <h3 className="mt-2 mb-4 font-heading text-3xl leading-none">
            Disputes to resolve
          </h3>
          <OrganizationDisputes />
        </div>
      ) : null}
    </div>
  );
}
