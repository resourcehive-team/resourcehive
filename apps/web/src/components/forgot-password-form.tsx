"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

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
import {
  PasswordResetError,
  requestPasswordReset,
} from "@/lib/auth-api";
import { cn } from "@/lib/utils";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setMessage("");
    setError("");

    const formData = new FormData(event.currentTarget);
    try {
      const result = await requestPasswordReset({
        email: String(formData.get("email") ?? ""),
      });
      setMessage(result.message);
    } catch (requestError) {
      setError(
        requestError instanceof PasswordResetError
          ? requestError.message
          : "Unable to request a password reset.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="auth-form-card">
        <CardHeader>
          <CardTitle className="auth-form-title">Forgot your password?</CardTitle>
          <CardDescription>
            Enter your account email and we&apos;ll send you a reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  autoComplete="email"
                  autoFocus
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "forgot-password-error" : undefined}
                  required
                />
              </Field>
              <Field>
                <FieldError id="forgot-password-error">{error}</FieldError>
                {message && <FieldDescription role="status">{message}</FieldDescription>}
                <Button className="w-full" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Sending reset link..." : "Send reset link"}
                </Button>
                <FieldDescription className="text-center">
                  Remember your password? <Link href="/login">Back to login</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
