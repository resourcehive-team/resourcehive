"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
import { getAuthProviders, getGoogleLoginUrl, register, RegistrationError } from "@/lib/auth-api";
import { storeSignupDebugData } from "@/lib/auth-storage";
import { cn } from "@/lib/utils";

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void getAuthProviders(controller.signal).then((providers) => setGoogleEnabled(providers.google.enabled)).catch(() => setGoogleEnabled(false));
    return () => controller.abort();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError("");
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await register({
        firstName: String(formData.get("firstName") ?? ""),
        lastName: String(formData.get("lastName") ?? ""),
        email: String(formData.get("email") ?? ""),
        password,
      });
      storeSignupDebugData(response);
      router.replace("/signup/status");
    } catch (registrationError) {
      setError(
        registrationError instanceof RegistrationError
          ? registrationError.message
          : "Unable to create your account. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="auth-form-card">
        <CardHeader>
          <CardTitle className="auth-form-title">Create an account</CardTitle>
          <CardDescription>
            Continue with Google, or create an account with your institutional email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs text-muted-foreground">
            <span className="text-destructive" aria-hidden="true">
              *
            </span>{" "}
            Required fields
          </p>
          {googleEnabled && (
            <>
              <Button type="button" variant="outline" className="mb-4 w-full" disabled={isSubmitting} onClick={() => window.location.assign(getGoogleLoginUrl("/dashboard"))}>
                <svg className="mr-2 h-4 w-4" aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </Button>
              <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true"><span className="h-px flex-1 bg-border" /><span>or create an account with institutional email</span><span className="h-px flex-1 bg-border" /></div>
            </>
          )}
          <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="firstName">
                  First name
                  <span className="text-destructive" aria-hidden="true">
                    *
                  </span>
                </FieldLabel>
                <Input
                  id="firstName"
                  name="firstName"
                  autoComplete="given-name"
                  autoFocus
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="lastName">
                  Last name
                  <span className="text-destructive" aria-hidden="true">
                    *
                  </span>
                </FieldLabel>
                <Input
                  id="lastName"
                  name="lastName"
                  autoComplete="family-name"
                  required
                />
              </Field>
              <Field>
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
                  placeholder="name@example.edu"
                  autoComplete="email"
                  required
                />
                <FieldDescription>
                  This must match a domain configured by your organization.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="password">
                  Password
                  <span className="text-destructive" aria-hidden="true">
                    *
                  </span>
                </FieldLabel>
                <PasswordInput
                  id="password"
                  name="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <FieldDescription>
                  Use at least 8 characters with a letter, number, and special
                  character.
                </FieldDescription>
              </Field>
              <Field
                data-invalid={
                  error === "Passwords do not match." ? "true" : undefined
                }
              >
                <FieldLabel htmlFor="confirmPassword">
                  Confirm password
                  <span className="text-destructive" aria-hidden="true">
                    *
                  </span>
                </FieldLabel>
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  autoComplete="new-password"
                  minLength={8}
                  aria-invalid={error === "Passwords do not match."}
                  aria-describedby={
                    error === "Passwords do not match."
                      ? "signup-error"
                      : undefined
                  }
                  required
                />
              </Field>
              <Field>
                <FieldError id="signup-error">{error}</FieldError>
                <Button
                  className="w-full"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating account..." : "Create account"}
                </Button>
                <FieldDescription className="text-center">
                  Already have an account? <Link href="/login">Log in</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
