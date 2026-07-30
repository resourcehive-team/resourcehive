"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { AccountProfileCard } from "@/components/account-profile-card";
import { AccountStatusCard } from "@/components/account-status-card";
import { RequestErrorCard } from "@/components/request-error-card";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AuthenticationRequiredError,
  getCurrentUser,
  logout,
  type CurrentUserResponse,
} from "@/lib/auth-api";

type AccountState =
  | { status: "loading" }
  | { status: "loaded"; account: CurrentUserResponse }
  | { status: "error"; error: unknown };

export function AccountDetails() {
  const router = useRouter();
  const [state, setState] = React.useState<AccountState>({
    status: "loading",
  });
  const [requestAttempt, setRequestAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();

    getCurrentUser(controller.signal)
      .then((account) => {
        setState({ status: "loaded", account });
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        if (requestError instanceof AuthenticationRequiredError) {
          void logout()
            .catch(() => undefined)
            .finally(() => {
              router.replace("/login");
              router.refresh();
            });
          return;
        }

        setState({ status: "error", error: requestError });
      });

    return () => controller.abort();
  }, [requestAttempt, router]);

  function retryRequest() {
    setState({ status: "loading" });
    setRequestAttempt((attempt) => attempt + 1);
  }

  if (state.status === "loading") {
    return <AccountDetailsSkeleton />;
  }

  if (state.status === "error") {
    return (
      <RequestErrorCard
        error={state.error}
        subject="Account"
        onRetry={retryRequest}
      />
    );
  }

  return (
    <>
      <AccountProfileCard user={state.account.user} />
      <AccountStatusCard account={state.account} />
    </>
  );
}

function AccountDetailsSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading account details"
      className="grid gap-4"
    >
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </CardHeader>
        <CardContent className="grid gap-4">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </CardHeader>
        <CardContent className="grid gap-4">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
