import type { RegistrationResponse } from "@/lib/auth-api";

const accessTokenKey = "resourcehive_access_token";
const signupDebugDataKey = "resourcehive_signup_debug_data";

// Temporary until the backend supports an HttpOnly cookie session.
// localStorage tokens can be read by JavaScript if the page has an XSS flaw.
export function storeAccessToken(token: string) {
  localStorage.setItem(accessTokenKey, token);
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
