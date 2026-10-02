"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  AuthenticationRequiredError,
  getCurrentUser,
  logout,
  type CurrentUserResponse,
} from "@/lib/auth-api";

type CurrentUserState =
  | { status: "loading"; account: null; error: null }
  | { status: "loaded"; account: CurrentUserResponse; error: null }
  | { status: "error"; account: null; error: unknown };

type DashboardCurrentUserContextValue = {
  state: CurrentUserState;
  retry: () => void;
  setAccount: (account: CurrentUserResponse) => void;
  updateAvatar: (avatarUrl: string | null) => void;
};

const DashboardCurrentUserContext =
  React.createContext<DashboardCurrentUserContextValue | null>(null);

export function DashboardCurrentUserProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const [state, setState] = React.useState<CurrentUserState>({
    status: "loading",
    account: null,
    error: null,
  });
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();

    getCurrentUser(controller.signal)
      .then((account) => {
        setState({ status: "loaded", account, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        if (error instanceof AuthenticationRequiredError) {
          void logout()
            .catch(() => undefined)
            .finally(() => {
              router.replace("/login");
              router.refresh();
            });
          return;
        }

        setState({ status: "error", account: null, error });
      });

    return () => controller.abort();
  }, [attempt, router]);

  const value = React.useMemo<DashboardCurrentUserContextValue>(
    () => ({
      state,
      retry: () => {
        setState({ status: "loading", account: null, error: null });
        setAttempt((value) => value + 1);
      },
      setAccount: (account) =>
        setState({ status: "loaded", account, error: null }),
      updateAvatar: (avatarUrl) =>
        setState((current) =>
          current.status === "loaded"
            ? {
                status: "loaded",
                error: null,
                account: {
                  ...current.account,
                  user: { ...current.account.user, avatarUrl },
                },
              }
            : current,
        ),
    }),
    [state],
  );

  return (
    <DashboardCurrentUserContext.Provider value={value}>
      {children}
    </DashboardCurrentUserContext.Provider>
  );
}

export function useDashboardCurrentUser() {
  const context = React.useContext(DashboardCurrentUserContext);
  if (!context) {
    throw new Error(
      "useDashboardCurrentUser must be used inside DashboardCurrentUserProvider",
    );
  }
  return context;
}
