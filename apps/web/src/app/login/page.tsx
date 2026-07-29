import { LoginForm } from "@/components/login-form";

interface LoginPageProps {
  searchParams: Promise<{
    next?: string | string[];
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
  const redirectTo = getSafeRedirectPath((await searchParams).next);

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm redirectTo={redirectTo} />
      </div>
    </div>
  );
}
