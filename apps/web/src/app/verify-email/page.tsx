import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmailVerificationError, verifyEmail } from "@/lib/auth-api";

interface VerifyEmailPageProps {
  searchParams: Promise<{
    token?: string | string[];
  }>;
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const tokenValue = (await searchParams).token;
  const token = typeof tokenValue === "string" ? tokenValue : "";
  let title = "Email verified";
  let message = "Your email is verified. You can now log in.";

  if (!token) {
    title = "Verification link is invalid";
    message = "This link does not contain an email verification token.";
  } else {
    try {
      await verifyEmail(token);
    } catch (error) {
      title = "Email verification failed";
      message =
        error instanceof EmailVerificationError
          ? error.message
          : "Unable to verify this email address.";
    }
  }

  return (
    <main className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button nativeButton={false} render={<Link href="/login" />}>
              Go to login
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
