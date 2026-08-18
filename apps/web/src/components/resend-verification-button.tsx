"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  resendVerificationEmail,
  ResendVerificationError,
} from "@/lib/auth-api";

export function ResendVerificationButton({ email }: { email: string | null }) {
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleResend() {
    if (!email || isSending || message) {
      return;
    }

    setIsSending(true);
    setError("");

    try {
      const result = await resendVerificationEmail(email);
      setMessage(result.message);
    } catch (resendError) {
      setError(
        resendError instanceof ResendVerificationError
          ? resendError.message
          : "Unable to resend the verification email.",
      );
    } finally {
      setIsSending(false);
    }
  }

  const description = error
    ? error
    : message
      ? message
      : email
        ? "A new link can be requested if the original email did not arrive."
        : "Return to login and enter your account details before requesting another link.";

  return (
    <div className="space-y-2">
      <Button
        aria-describedby="resend-verification-help"
        className="w-full"
        disabled={!email || isSending || Boolean(message)}
        onClick={handleResend}
        type="button"
        variant="outline"
      >
        {isSending
          ? "Sending verification link..."
          : message
            ? "Verification link requested"
            : "Resend verification link"}
      </Button>
      <p
        className={
          error
            ? "text-xs leading-5 text-destructive"
            : "text-xs leading-5 text-muted-foreground"
        }
        id="resend-verification-help"
        role={error ? "alert" : "status"}
      >
        {description}
      </p>
    </div>
  );
}
