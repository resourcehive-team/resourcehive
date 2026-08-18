import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/reset-password-form";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = {
  title: "Reset password | ResourceHive",
  referrer: "no-referrer",
};

interface ResetPasswordPageProps {
  searchParams: Promise<{
    token?: string | string[];
  }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const tokenValue = (await searchParams).token;
  const token = typeof tokenValue === "string" ? tokenValue : "";

  return (
    <AuthShell>
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
