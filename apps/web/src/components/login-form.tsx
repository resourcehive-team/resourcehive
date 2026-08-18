"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { login, LoginError } from "@/lib/auth-api";
import { markSignupEmailVerified } from "@/lib/auth-storage";
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
  className,
  ...props
}: React.ComponentProps<"div"> & {
  redirectTo?: string;
  passwordReset?: boolean;
}) {
  const router = useRouter();
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

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
            Enter your institutional email to continue to ResourceHive.
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
                  <Link className="text-sm underline-offset-4 hover:underline" href="/forgot-password">
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
