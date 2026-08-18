"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { Check, LockKeyhole, Mail } from "lucide-react";

import { AuthShell } from "@/components/auth-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  subscribeToSignupDebugData,
} from "@/lib/auth-storage";

const verificationSteps = [
  {
    title: "Open your inbox",
    description: "Use the inbox for the email address you signed up with.",
  },
  {
    title: "Find the ResourceHive email",
    description: "Check your spam or junk folder if it is not in your inbox.",
  },
  {
    title: "Open the verification link",
    description: "The secure link confirms that the email belongs to you.",
  },
] as const;

export default function SignupStatusPage() {
  const router = useRouter();
  const storedSignup = useSyncExternalStore(
    subscribeToSignupDebugData,
    getSignupDebugDataSnapshot,
    () => null,
  );
  const signup = useMemo(
    () => parseSignupDebugData(storedSignup),
    [storedSignup],
  );
  const isVerified = signup?.user.emailVerified === true;

  useEffect(() => {
    if (isVerified) {
      router.replace("/login");
    }
  }, [isVerified, router]);

  if (isVerified) {
    return null;
  }

  return (
    <AuthShell>
      <Card className="auth-form-card">
        <CardHeader>
          <p className="eyebrow text-clay">Account created</p>
          <CardTitle className="auth-form-title">Check your inbox.</CardTitle>
          <CardDescription className="leading-6">
            {signup ? (
              <>
                We created your account for{" "}
                <strong className="font-medium text-foreground">
                  {signup.user.email}
                </strong>
                . Verify this email address before you log in.
              </>
            ) : (
              "Verify the email address you used to create your ResourceHive account before you log in."
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {signup && (
            <div className="grid grid-cols-2 border border-line text-sm">
              <div className="border-r border-line p-3">
                <p className="mb-2 text-xs text-muted-foreground">Account</p>
                <Badge variant="success">
                  <Check aria-hidden="true" /> Created
                </Badge>
              </div>
              <div className="p-3">
                <p className="mb-2 text-xs text-muted-foreground">
                  Email verification
                </p>
                <Badge variant="warning">Required</Badge>
              </div>
            </div>
          )}

          <section aria-labelledby="verification-steps-title">
                <div className="mb-3 flex items-center gap-2">
                  <Mail className="size-4" aria-hidden="true" />
                  <h2
                    id="verification-steps-title"
                    className="text-sm font-medium"
                  >
                    How to verify your email
                  </h2>
                </div>
                <ol className="border border-line">
                  {verificationSteps.map((step, index) => (
                    <li
                      className="grid grid-cols-[2rem_1fr] gap-3 border-b border-line p-3 last:border-b-0"
                      key={step.title}
                    >
                      <span className="eyebrow pt-0.5 text-clay">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{step.title}</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
          </section>

          <div className="flex gap-3 border border-ochre bg-ochre/10 p-4">
                <LockKeyhole
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-medium">You cannot log in yet</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Your account exists, but login remains locked until you
                    verify your email identity.
                  </p>
                </div>
          </div>

          <div className="grid gap-2">
                <Button
                  aria-describedby="resend-verification-help"
                  disabled
                  variant="outline"
                >
                  Resend verification link
                </Button>
                <Button
                  nativeButton={false}
                  render={<Link href="/login" />}
                  variant="ghost"
                >
                  Return to login
                </Button>
          </div>

          <p
            className="text-xs leading-5 text-muted-foreground"
            id="resend-verification-help"
          >
            Resending is not available yet. The original verification link
            must be used for now.
          </p>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
