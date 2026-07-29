"use client";

import { useEffect } from "react";

import { getEmailVerificationStatus } from "@/lib/auth-api";
import { markSignupEmailVerified } from "@/lib/auth-storage";

interface SignupVerificationStatusSyncProps {
  email: string;
  emailVerified: boolean;
  verificationUrl: string;
}

const verificationPollIntervalMs = 3_000;

export function SignupVerificationStatusSync({
  email,
  emailVerified,
  verificationUrl,
}: SignupVerificationStatusSyncProps) {
  useEffect(() => {
    if (emailVerified) {
      return;
    }

    let token = "";
    try {
      token = new URL(verificationUrl, window.location.origin).searchParams.get(
        "token",
      ) ?? "";
    } catch {
      return;
    }

    if (!token) {
      return;
    }

    let cancelled = false;

    async function refreshStatus() {
      try {
        const status = await getEmailVerificationStatus(token);
        if (!cancelled && status.emailVerified) {
          markSignupEmailVerified(email);
        }
      } catch {
        // Keep the saved status unchanged when the status check is unavailable.
      }
    }

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void refreshStatus();
      }
    }

    void refreshStatus();
    const interval = window.setInterval(
      refreshStatus,
      verificationPollIntervalMs,
    );
    window.addEventListener("focus", refreshStatus);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshStatus);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [email, emailVerified, verificationUrl]);

  return null;
}
