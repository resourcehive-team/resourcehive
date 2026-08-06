"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { PasswordInput } from "@/components/password-input";
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
import { PasswordResetError, resetPassword } from "@/lib/auth-api";
import { cn } from "@/lib/utils";

export function ResetPasswordForm({
  token,
  className,
  ...props
}: React.ComponentProps<"div"> & { token: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(
    token ? "" : "This password reset link is invalid.",
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !token) return;

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
      await resetPassword({ token, password });
      router.replace("/login?passwordReset=success");
      router.refresh();
    } catch (resetError) {
      setError(
        resetError instanceof PasswordResetError
          ? resetError.message
          : "Unable to reset your password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>
            Use a password you have not used for this account before.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
            <FieldGroup>
              <Field data-invalid={error ? "true" : undefined}>
                <FieldLabel htmlFor="password">
                  New password
                  <span className="text-destructive" aria-hidden="true">*</span>
                </FieldLabel>
                <PasswordInput
                  id="password"
                  name="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  disabled={!token || isSubmitting}
                  required
                />
                <FieldDescription>
                  Use 8–72 characters with a letter, number, and special character.
                </FieldDescription>
              </Field>
              <Field data-invalid={error ? "true" : undefined}>
                <FieldLabel htmlFor="confirmPassword">
                  Confirm new password
                  <span className="text-destructive" aria-hidden="true">*</span>
                </FieldLabel>
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  disabled={!token || isSubmitting}
                  required
                />
              </Field>
              <Field>
                <FieldError id="reset-password-error">{error}</FieldError>
                <Button className="w-full" type="submit" disabled={!token || isSubmitting}>
                  {isSubmitting ? "Resetting password..." : "Reset password"}
                </Button>
                <FieldDescription className="text-center">
                  <Link href="/login">Back to login</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
