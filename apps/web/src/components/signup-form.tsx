"use client";

import { useState, type FormEvent } from "react";
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
import { register, RegistrationError } from "@/lib/auth-api";
import { storeSignupDebugData } from "@/lib/auth-storage";
import { cn } from "@/lib/utils";

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

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
      <Card>
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>
            Use the email address provided by your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs text-muted-foreground">
            <span className="text-destructive" aria-hidden="true">
              *
            </span>{" "}
            Required fields
          </p>
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
