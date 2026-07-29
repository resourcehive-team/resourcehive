"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import {
  clearAccessToken,
  getAccessToken,
  isAccessTokenUsable,
  subscribeToAccessToken,
} from "@/lib/auth-storage";

function subscribeToHydration() {
  return () => undefined;
}

function getHydratedSnapshot() {
  return true;
}

function getServerHydratedSnapshot() {
  return false;
}

export function AppEntryRedirect() {
  const router = useRouter();
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydratedSnapshot,
  );
  const token = useSyncExternalStore(
    subscribeToAccessToken,
    getAccessToken,
    () => null,
  );
  const isAuthenticated = isAccessTokenUsable(token);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (token && !isAuthenticated) {
      clearAccessToken();
    }

    router.replace(isAuthenticated ? "/dashboard" : "/login");
  }, [isAuthenticated, isHydrated, router, token]);

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <p>Opening ResourceHive...</p>
    </main>
  );
}
