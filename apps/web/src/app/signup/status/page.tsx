"use client";

import { useMemo, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignupVerificationStatusSync } from "@/components/signup-verification-status-sync";
import {
  getSignupDebugDataSnapshot,
  parseSignupDebugData,
  subscribeToSignupDebugData,
} from "@/lib/auth-storage";

export default function SignupStatusPage() {
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
      {signup?.developmentVerificationUrl && (
        <SignupVerificationStatusSync
          email={signup.user.email}
          emailVerified={signup.user.emailVerified}
          verificationUrl={signup.developmentVerificationUrl}
        />
      )}
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle>Signup status</CardTitle>
            <CardDescription>
              Temporary signup details for development and debugging.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {signup ? (
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm [&>dd]:min-w-0 [&>dd]:break-words [&>dt]:font-medium [&>dt]:text-muted-foreground">
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
                {signup.developmentVerificationUrl && (
                  <>
                    <dt>Development verification</dt>
                    <dd>
                      <Button
                        size="sm"
                        nativeButton={false}
                        render={<a href={signup.developmentVerificationUrl} />}
                      >
                        Verify email
                      </Button>
                    </dd>
                  </>
                )}
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
