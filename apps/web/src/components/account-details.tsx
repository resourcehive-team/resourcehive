"use client";

import * as React from "react";

import { AccountProfileCard } from "@/components/account-profile-card";
import { AccountStatusCard } from "@/components/account-status-card";
import { useDashboardCurrentUser } from "@/components/dashboard-current-user";
import { SignInMethodsCard } from "@/components/sign-in-methods-card";
import { RequestErrorCard } from "@/components/request-error-card";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
export function AccountDetails() {
  const { state, retry, setAccount, updateAvatar } =
    useDashboardCurrentUser();

  if (state.status === "loading") {
    return <AccountDetailsSkeleton />;
  }

  if (state.status === "error") {
    return (
      <RequestErrorCard
        error={state.error}
        subject="Account"
        onRetry={retry}
      />
    );
  }

  return (
    <>
      <AccountProfileCard
        user={state.account.user}
        onAvatarChanged={updateAvatar}
      />
      <AccountStatusCard account={state.account} />
      <SignInMethodsCard account={state.account} onAccountUpdated={setAccount} />
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
