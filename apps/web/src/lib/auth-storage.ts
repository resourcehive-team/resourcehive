import type { RegistrationResponse } from "@/lib/auth-api";

const signupDebugDataKey = "resourcehive_signup_debug_data";
const verifiedSignupEmailKey = "resourcehive_verified_signup_email";
const pendingVerificationEmailKey = "resourcehive_pending_verification_email";
const signupDebugDataChangedEvent = "resourcehive:signup-debug-data-changed";

export function storeSignupDebugData(data: RegistrationResponse) {
  localStorage.setItem(signupDebugDataKey, JSON.stringify(data));
  sessionStorage.removeItem(signupDebugDataKey);

  const normalizedEmail = data.user.email.toLowerCase();
  if (data.user.emailVerified) {
    if (localStorage.getItem(pendingVerificationEmailKey) === normalizedEmail) {
      localStorage.removeItem(pendingVerificationEmailKey);
    }
  } else {
    localStorage.setItem(pendingVerificationEmailKey, normalizedEmail);
  }

  window.dispatchEvent(new Event(signupDebugDataChangedEvent));
}

export function storePendingVerificationEmail(email: string) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(pendingVerificationEmailKey, email.trim().toLowerCase());
  window.dispatchEvent(new Event(signupDebugDataChangedEvent));
}

export function markSignupEmailVerified(verifiedEmail: string) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedEmail = verifiedEmail.toLowerCase();
  localStorage.setItem(verifiedSignupEmailKey, normalizedEmail);
  if (localStorage.getItem(pendingVerificationEmailKey) === normalizedEmail) {
    localStorage.removeItem(pendingVerificationEmailKey);
  }

  const signup = parseSignupDebugData(getSignupDebugDataSnapshot());
  if (!signup || signup.user.email.toLowerCase() !== normalizedEmail) {
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

export function getPendingVerificationEmailSnapshot(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(pendingVerificationEmailKey);
}

export function subscribeToSignupDebugData(onStoreChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (
      event.key === signupDebugDataKey ||
      event.key === verifiedSignupEmailKey ||
      event.key === pendingVerificationEmailKey
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

export function hasPendingSignupForEmail(email: string): boolean {
  const signup = parseSignupDebugData(getSignupDebugDataSnapshot());

  return Boolean(
    signup &&
    !signup.user.emailVerified &&
    signup.user.email.toLowerCase() === email.trim().toLowerCase(),
  );
}
