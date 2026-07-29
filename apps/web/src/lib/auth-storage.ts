import type { RegistrationResponse } from "@/lib/auth-api";

const accessTokenKey = "resourcehive_access_token";
const signupDebugDataKey = "resourcehive_signup_debug_data";
const verifiedSignupEmailKey = "resourcehive_verified_signup_email";
const accessTokenChangedEvent = "resourcehive:access-token-changed";
const signupDebugDataChangedEvent = "resourcehive:signup-debug-data-changed";

// Temporary until the backend supports an HttpOnly cookie session.
// localStorage tokens can be read by JavaScript if the page has an XSS flaw.
export function storeAccessToken(token: string) {
  localStorage.setItem(accessTokenKey, token);
  window.dispatchEvent(new Event(accessTokenChangedEvent));
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
  window.dispatchEvent(new Event(accessTokenChangedEvent));
}

export function subscribeToAccessToken(onStoreChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === accessTokenKey) {
      onStoreChange();
    }
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(accessTokenChangedEvent, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(accessTokenChangedEvent, onStoreChange);
  };
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
  localStorage.setItem(signupDebugDataKey, JSON.stringify(data));
  sessionStorage.removeItem(signupDebugDataKey);
  window.dispatchEvent(new Event(signupDebugDataChangedEvent));
}

export function markSignupEmailVerified(verifiedEmail: string) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedEmail = verifiedEmail.toLowerCase();
  localStorage.setItem(verifiedSignupEmailKey, normalizedEmail);

  const signup = parseSignupDebugData(getSignupDebugDataSnapshot());
  if (
    !signup ||
    signup.user.email.toLowerCase() !== normalizedEmail
  ) {
    window.dispatchEvent(new Event(signupDebugDataChangedEvent));
    return;
  }

  storeSignupDebugData({
    ...signup,
    user: {
      ...signup.user,
      emailVerified: true,
    },
  });
}

export function getSignupDebugDataSnapshot(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedData =
    localStorage.getItem(signupDebugDataKey) ??
    sessionStorage.getItem(signupDebugDataKey);
  const signup = parseSignupDebugData(storedData);
  const verifiedEmail = localStorage.getItem(verifiedSignupEmailKey);

  if (
    signup &&
    verifiedEmail === signup.user.email.toLowerCase() &&
    !signup.user.emailVerified
  ) {
    return JSON.stringify({
      ...signup,
      user: {
        ...signup.user,
        emailVerified: true,
      },
    });
  }

  return storedData;
}

export function subscribeToSignupDebugData(onStoreChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (
      event.key === signupDebugDataKey ||
      event.key === verifiedSignupEmailKey
    ) {
      onStoreChange();
    }
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(signupDebugDataChangedEvent, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(signupDebugDataChangedEvent, onStoreChange);
  };
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
