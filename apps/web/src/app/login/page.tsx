import { LoginForm } from "@/components/login-form";
import { AuthShell } from "@/components/auth-shell";

interface LoginPageProps {
  searchParams: Promise<{
    next?: string | string[];
    passwordReset?: string | string[];
  }>;
}

function getSafeRedirectPath(value: string | string[] | undefined) {
  const fallback = "/dashboard";
  if (typeof value !== "string" || !value.startsWith("/")) {
    return fallback;
  }

  try {
    const applicationOrigin = "https://app.resourcehive.local";
    const destination = new URL(value, applicationOrigin);

    if (destination.origin !== applicationOrigin) {
      return fallback;
    }

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return fallback;
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const query = await searchParams;
  const redirectTo = getSafeRedirectPath(query.next);
  const passwordReset = query.passwordReset === "success";

  return (
    <AuthShell>
      <LoginForm redirectTo={redirectTo} passwordReset={passwordReset} />
    </AuthShell>
  );
}
