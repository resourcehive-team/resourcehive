"use client";

import { useMemo, useSyncExternalStore } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getSignupDebugDataSnapshot,
  parseSignupDebugData,
} from "@/lib/auth-storage";

function subscribeToSignupDebugData() {
  return () => undefined;
}

export default function DashboardPage() {
  const storedSignup = useSyncExternalStore(
    subscribeToSignupDebugData,
    getSignupDebugDataSnapshot,
    () => null,
  );
  const signup = useMemo(
    () => parseSignupDebugData(storedSignup),
    [storedSignup],
  );

  return (
    <main className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle>Development dashboard</CardTitle>
            <CardDescription>
              Temporary signup details for development and debugging.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {signup ? (
              <dl>
                <dt>Name</dt>
                <dd>
                  {signup.user.firstName} {signup.user.lastName}
                </dd>
                <dt>Email</dt>
                <dd>{signup.user.email}</dd>
                <dt>User ID</dt>
                <dd>{signup.user.id}</dd>
                <dt>Status</dt>
                <dd>{signup.user.status}</dd>
                <dt>Email verified</dt>
                <dd>{signup.user.emailVerified ? "Yes" : "No"}</dd>
                <dt>Organization</dt>
                <dd>{signup.user.organization.name}</dd>
              </dl>
            ) : (
              <p>No signup details are available in this browser session.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
