"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { OrganizationAnalyticsSection } from "@/components/organization-analytics";
import { PersonalAnalyticsSection } from "@/components/personal-analytics";
import { PlatformAnalyticsSection } from "@/components/platform-analytics";
import { RequestErrorCard } from "@/components/request-error-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthenticationRequiredError, getCurrentUser } from "@/lib/auth-api";

type State =
  | { status: "loading" }
  | { status: "loaded"; isPlatformAdmin: boolean; isOrgAdmin: boolean }
  | { status: "error"; error: unknown };

export function AnalyticsSections() {
  const router = useRouter();
  const [state, setState] = React.useState<State>({ status: "loading" });
  const [requestAttempt, setRequestAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();

    getCurrentUser(controller.signal)
      .then((account) => {
        setState({
          status: "loaded",
          isPlatformAdmin: account.user.platformRole === "PLATFORM_ADMIN",
          isOrgAdmin:
            account.organizationContext.role?.toUpperCase() === "ADMIN",
        });
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setState({ status: "error", error: requestError });

        if (requestError instanceof AuthenticationRequiredError) {
          router.replace("/login");
          router.refresh();
        }
      });

    return () => controller.abort();
  }, [requestAttempt, router]);

  if (state.status === "loading") {
    return <Skeleton aria-label="Loading analytics" aria-busy="true" className="h-64 w-full rounded-none" />;
  }

  if (state.status === "error") {
    return (
      <RequestErrorCard
        error={state.error}
        subject="Analytics"
        onRetry={() => {
          setState({ status: "loading" });
          setRequestAttempt((attempt) => attempt + 1);
        }}
      />
    );
  }

  if (state.isPlatformAdmin) {
    return <PlatformAnalyticsSection />;
  }

  if (!state.isOrgAdmin) {
    return <PersonalAnalyticsSection />;
  }

  return (
    <Tabs defaultValue="me" className="gap-6">
      <TabsList>
        <TabsTrigger value="me">My analytics</TabsTrigger>
        <TabsTrigger value="org">Organization</TabsTrigger>
      </TabsList>

      <TabsContent value="me">
        <PersonalAnalyticsSection />
      </TabsContent>

      <TabsContent value="org">
        <OrganizationAnalyticsSection />
      </TabsContent>
    </Tabs>
  );
}
