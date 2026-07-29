import type { RegistrationResponse } from "@/lib/auth-api";

const accessTokenKey = "resourcehive_access_token";
const signupDebugDataKey = "resourcehive_signup_debug_data";

// Temporary until the backend supports an HttpOnly cookie session.
// localStorage tokens can be read by JavaScript if the page has an XSS flaw.
export function storeAccessToken(token: string) {
  localStorage.setItem(accessTokenKey, token);
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(accessTokenKey);
}

export function clearAccessToken() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(accessTokenKey);
}

export function isAccessTokenUsable(token: string | null): token is string {
  if (!token) {
    return false;
  }

  const tokenParts = token.split(".");
  if (tokenParts.length !== 3) {
    return false;
  }

  try {
    const encodedPayload = tokenParts[1]
      .replaceAll("-", "+")
      .replaceAll("_", "/");
    const padding = "=".repeat((4 - (encodedPayload.length % 4)) % 4);
    const payload = JSON.parse(atob(encodedPayload + padding)) as {
      exp?: unknown;
    };

    return (
      typeof payload.exp === "number" && payload.exp * 1000 > Date.now()
    );
  } catch {
    return false;
  }
}

export function storeSignupDebugData(data: RegistrationResponse) {
  sessionStorage.setItem(signupDebugDataKey, JSON.stringify(data));
}

export function getSignupDebugDataSnapshot(): string | null {
  return sessionStorage.getItem(signupDebugDataKey);
}

export function parseSignupDebugData(
  storedData: string | null,
): RegistrationResponse | null {
  if (!storedData) {
    return null;
  }

  try {
    return JSON.parse(storedData) as RegistrationResponse;
  } catch {
    return null;
  }
}
