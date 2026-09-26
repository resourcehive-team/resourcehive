"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { getAuthProviders, getGoogleLoginUrl, login, LoginError } from "@/lib/auth-api";
import {
  hasPendingSignupForEmail,
  markSignupEmailVerified,
  storePendingVerificationEmail,
} from "@/lib/auth-storage";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { refreshSession } from "@/lib/session-api";

export function LoginForm({
  redirectTo = "/dashboard",
  passwordReset = false,
  oauthError = "",
  className,
  ...props
}: React.ComponentProps<"div"> & {
  redirectTo?: string;
  passwordReset?: boolean;
  oauthError?: string;
}) {
  const router = useRouter();
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    let active = true;

    void refreshSession().then((restored) => {
      if (!active) return;
      if (restored) {
        router.replace(redirectTo);
        router.refresh();
        return;
      }
      setIsRestoringSession(false);
    });

    return () => {
      active = false;
    };
  }, [redirectTo, router]);

  useEffect(() => {
    const controller = new AbortController();
    void getAuthProviders(controller.signal)
      .then((providers) => setGoogleEnabled(providers.google.enabled))
      .catch(() => setGoogleEnabled(false));
    return () => controller.abort();
  }, []);

  const oauthMessage: Record<string, string> = {
    ACCOUNT_EMAIL_EXISTS: "An account already uses that email. Sign in with email and password, then connect Google from Account Settings.",
    GOOGLE_NOT_CONNECTED: "Google sign-in could not be completed. The account may be unavailable or the sign-in expired.",
    GOOGLE_UNAVAILABLE: "Google sign-in is temporarily unavailable. Use email and password instead.",
    GOOGLE_CANCELLED: "Google sign-in was cancelled. You can try again or use email and password.",
    ACCOUNT_SUSPENDED: "This ResourceHive account is unavailable. Contact an administrator if you believe this is a mistake.",
    OAUTH_FAILED: "Google sign-in could not be completed. Please try again.",
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      await login({ email, password });
      markSignupEmailVerified(email);
      router.replace(redirectTo);
      router.refresh();
    } catch (loginError) {
      if (
        loginError instanceof LoginError &&
        (loginError.code === "EMAIL_VERIFICATION_REQUIRED" ||
          (loginError.code === "INVALID_CREDENTIALS" &&
            hasPendingSignupForEmail(email)))
      ) {
        storePendingVerificationEmail(email);
        router.replace("/signup/status");
        router.refresh();
        return;
      }

      setError(
        loginError instanceof LoginError
          ? loginError.message
          : "Unable to log in. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="auth-form-card">
        <CardHeader>
          <CardTitle className="auth-form-title">Welcome back</CardTitle>
          <CardDescription>
            Continue with Google, or enter your ResourceHive email and password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {passwordReset && (
            <p className="mb-4 text-sm text-muted-foreground" role="status">
              Your password has been reset. Log in with your new password.
            </p>
          )}
          <p className="mb-4 text-xs text-muted-foreground">
            <span className="text-destructive" aria-hidden="true">
              *
            </span>{" "}
            Required fields
          </p>
          {oauthError && oauthMessage[oauthError] && (
            <p className="mb-4 text-sm text-destructive" role="alert">{oauthMessage[oauthError]}</p>
          )}
          {googleEnabled && (
            <>
              <Button
                type="button"
                variant="outline"
                className="mb-4 w-full"
                disabled={isRestoringSession || isSubmitting}
                onClick={() => { window.location.assign(getGoogleLoginUrl(redirectTo)); }}
              >
                <span aria-hidden="true" className="mr-2 font-semibold">G</span>
                Continue with Google
              </Button>
              <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
                <span className="h-px flex-1 bg-border" /><span>or</span><span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}
          <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
            <FieldGroup>
              <Field data-invalid={error ? "true" : undefined}>
                <FieldLabel htmlFor="email">
                  Institutional email
                  <span className="text-destructive" aria-hidden="true">
                    *
                  </span>
                </FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@uom.lk"
                  autoComplete="email"
                  autoFocus
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "login-error" : undefined}
                  disabled={isRestoringSession || isSubmitting}
                  required
                />
              </Field>
              <Field data-invalid={error ? "true" : undefined}>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="password">
                    Password
                    <span className="text-destructive" aria-hidden="true">
                      *
                    </span>
                  </FieldLabel>
                  <Link
                    className="text-sm underline-offset-4 hover:underline"
                    href="/forgot-password"
                  >
                    Forgot password?
                  </Link>
                </div>
                <PasswordInput
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "login-error" : undefined}
                  disabled={isRestoringSession || isSubmitting}
                  required
                />
              </Field>
              <Field>
                <FieldError id="login-error">{error}</FieldError>
                <Button
                  className="w-full"
                  type="submit"
                  disabled={isRestoringSession || isSubmitting}
                >
                  {isRestoringSession
                    ? "Checking session..."
                    : isSubmitting
                      ? "Logging in..."
                      : "Login"}
                </Button>
                <FieldDescription className="text-center">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup">Sign up</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
