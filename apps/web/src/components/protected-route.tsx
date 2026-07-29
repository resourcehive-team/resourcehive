"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  clearAccessToken,
  getAccessToken,
  isAccessTokenUsable,
  subscribeToAccessToken,
} from "@/lib/auth-storage";

interface ProtectedRouteProps {
  children: ReactNode;
}

function subscribeToHydration() {
  return () => undefined;
}

function getHydratedSnapshot() {
  return true;
}

function getServerHydratedSnapshot() {
  return false;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const pathname = usePathname();
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
    if (isHydrated && !isAuthenticated) {
      clearAccessToken();
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isHydrated, pathname, router]);

  if (!isHydrated || !isAuthenticated) {
    return (
      <main className="flex min-h-svh items-center justify-center p-6">
        <p>Checking your session...</p>
      </main>
    );
  }

  return children;
}
