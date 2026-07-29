"use client";

import { useEffect } from "react";

import { markSignupEmailVerified } from "@/lib/auth-storage";

interface SignupVerificationSyncProps {
  verifiedEmail: string;
}

export function SignupVerificationSync({
  verifiedEmail,
}: SignupVerificationSyncProps) {
  useEffect(() => {
    markSignupEmailVerified(verifiedEmail);
  }, [verifiedEmail]);

  return null;
}
