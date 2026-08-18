import { apiUrl } from "@/lib/config";
import { fetchWithSessionRefresh } from "@/lib/session-api";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: "user login successfully";
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface PasswordResetRequest {
  token: string;
  password: string;
}

export interface PasswordResetResponse {
  message: string;
}

export interface CurrentUserResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    displayName: string;
    emailVerified: boolean;
    status: string;
    platformRole: string;
    createdAt: string;
  };
  organizationContext: {
    organizationId: string | null;
    role: string | null;
  };
}

export interface RegistrationRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface RegisteredUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: string;
  emailVerified: boolean;
  organization: {
    id: string;
    name: string;
  };
}

export interface RegistrationResponse {
  message: string;
  verificationRequired: true;
  developmentVerificationUrl?: string;
  user: RegisteredUser;
}

export interface EmailVerificationResponse {
  message: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
    emailVerifiedAt: string;
    emailVerified: true;
    organizations: Array<{
      id: string;
      name: string;
      role: string;
      status: string;
    }>;
  };
}

export interface EmailVerificationStatusResponse {
  status: "PENDING" | "EXPIRED" | "VERIFIED";
  emailVerified: boolean;
}

export type LoginErrorCode =
  | "INVALID_CREDENTIALS"
  | "SERVICE_UNAVAILABLE"
  | "INVALID_RESPONSE"
  | "REQUEST_FAILED";

export class LoginError extends Error {
  constructor(
    message: string,
    public readonly code: LoginErrorCode = "REQUEST_FAILED",
  ) {
    super(message);
    this.name = "LoginError";
  }
}

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Your session has expired. Log in again.");
    this.name = "AuthenticationRequiredError";
  }
}

export class RegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegistrationError";
  }
}

export class EmailVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailVerificationError";
  }
}

export class PasswordResetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasswordResetError";
  }
}

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  let response: Response;

  try {
    response = await fetch(`${apiUrl}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });
  } catch {
    throw new LoginError(
      "Unable to connect to the login service.",
      "SERVICE_UNAVAILABLE",
    );
  }

  if (!response.ok) {
    if (
      response.status === 400 ||
      response.status === 401 ||
      response.status === 404
    ) {
      throw new LoginError(
        "Email or password is incorrect.",
        "INVALID_CREDENTIALS",
      );
    }

    throw new LoginError("Unable to log in. Please try again.");
  }

  const data: unknown = await response.json().catch(() => null);

  if (
    !data ||
    typeof data !== "object" ||
    !("message" in data) ||
    data.message !== "user login successfully"
  ) {
    throw new LoginError(
      "The login service returned an invalid response.",
      "INVALID_RESPONSE",
    );
  }

  return {
    message: "user login successfully",
  };
}

export async function logout(): Promise<void> {
  const response = await fetch(`${apiUrl}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Unable to log out. Please try again.");
  }
}

export async function requestPasswordReset(
  request: ForgotPasswordRequest,
): Promise<PasswordResetResponse> {
  let response: Response;

  try {
    response = await fetch(`${apiUrl}/auth/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
  } catch {
    throw new PasswordResetError(
      "Unable to connect to the password reset service.",
    );
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok || !isPasswordResetResponse(data)) {
    throw new PasswordResetError(
      getApiErrorMessage(data, "Unable to request a password reset."),
    );
  }

  return data;
}

export async function resetPassword(
  request: PasswordResetRequest,
): Promise<PasswordResetResponse> {
  let response: Response;

  try {
    response = await fetch(`${apiUrl}/auth/reset-password`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
  } catch {
    throw new PasswordResetError(
      "Unable to connect to the password reset service.",
    );
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok || !isPasswordResetResponse(data)) {
    throw new PasswordResetError(
      getApiErrorMessage(data, "Unable to reset your password."),
    );
  }

  return data;
}

export async function getCurrentUser(
  signal?: AbortSignal,
): Promise<CurrentUserResponse> {
  let response: Response;

  try {
    response = await fetchWithSessionRefresh(`${apiUrl}/auth/me`, {
      credentials: "include",
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    throw new Error("Unable to load the current user.");
  }

  if (response.status === 401) {
    throw new AuthenticationRequiredError();
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok || !isCurrentUserResponse(data)) {
    throw new Error("The identity service returned an invalid user.");
  }

  return data;
}

export async function register(
  registration: RegistrationRequest,
): Promise<RegistrationResponse> {
  let response: Response;

  try {
    response = await fetch(`${apiUrl}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(registration),
    });
  } catch {
    throw new RegistrationError("Unable to connect to the signup service.");
  }

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new RegistrationError(
      getApiErrorMessage(data, "Unable to create your account."),
    );
  }

  if (!isRegistrationResponse(data)) {
    throw new RegistrationError(
      "The signup service returned an invalid response.",
    );
  }

  return data;
}

export async function verifyEmail(
  token: string,
): Promise<EmailVerificationResponse> {
  let response: Response;

  try {
    response = await fetch(`${apiUrl}/auth/verify-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
      cache: "no-store",
    });
  } catch {
    throw new EmailVerificationError(
      "Unable to connect to the email verification service.",
    );
  }

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new EmailVerificationError(
      getApiErrorMessage(data, "Unable to verify this email address."),
    );
  }

  if (!isEmailVerificationResponse(data)) {
    throw new EmailVerificationError(
      "The email verification service returned an invalid response.",
    );
  }

  return data;
}

export async function getEmailVerificationStatus(
  token: string,
): Promise<EmailVerificationStatusResponse> {
  let response: Response;

  try {
    response = await fetch(`${apiUrl}/auth/verification-status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
      cache: "no-store",
    });
  } catch {
    throw new EmailVerificationError(
      "Unable to check the email verification status.",
    );
  }

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok || !isEmailVerificationStatusResponse(data)) {
    throw new EmailVerificationError(
      getApiErrorMessage(
        data,
        "Unable to check the email verification status.",
      ),
    );
  }

  return data;
}

function getApiErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object" || !("message" in data)) {
    return fallback;
  }

  if (typeof data.message === "string") {
    return data.message;
  }

  if (
    Array.isArray(data.message) &&
    data.message.every((message) => typeof message === "string")
  ) {
    return data.message.join(" ");
  }

  return fallback;
}

function isCurrentUserResponse(data: unknown): data is CurrentUserResponse {
  if (
    !data ||
    typeof data !== "object" ||
    !("user" in data) ||
    !data.user ||
    typeof data.user !== "object" ||
    !("organizationContext" in data) ||
    !data.organizationContext ||
    typeof data.organizationContext !== "object"
  ) {
    return false;
  }

  const user = data.user;
  const organizationContext = data.organizationContext;

  return (
    "id" in user &&
    typeof user.id === "string" &&
    "email" in user &&
    typeof user.email === "string" &&
    "firstName" in user &&
    typeof user.firstName === "string" &&
    "lastName" in user &&
    typeof user.lastName === "string" &&
    "displayName" in user &&
    typeof user.displayName === "string" &&
    "emailVerified" in user &&
    typeof user.emailVerified === "boolean" &&
    "status" in user &&
    typeof user.status === "string" &&
    "platformRole" in user &&
    typeof user.platformRole === "string" &&
    "createdAt" in user &&
    typeof user.createdAt === "string" &&
    "organizationId" in organizationContext &&
    (typeof organizationContext.organizationId === "string" ||
      organizationContext.organizationId === null) &&
    "role" in organizationContext &&
    (typeof organizationContext.role === "string" ||
      organizationContext.role === null)
  );
}

function isRegistrationResponse(data: unknown): data is RegistrationResponse {
  if (
    !data ||
    typeof data !== "object" ||
    !("message" in data) ||
    typeof data.message !== "string" ||
    !("verificationRequired" in data) ||
    data.verificationRequired !== true ||
    ("developmentVerificationUrl" in data &&
      typeof data.developmentVerificationUrl !== "string") ||
    !("user" in data) ||
    !data.user ||
    typeof data.user !== "object"
  ) {
    return false;
  }

  const user = data.user;
  return (
    "id" in user &&
    typeof user.id === "string" &&
    "email" in user &&
    typeof user.email === "string" &&
    "firstName" in user &&
    typeof user.firstName === "string" &&
    "lastName" in user &&
    typeof user.lastName === "string" &&
    "status" in user &&
    typeof user.status === "string" &&
    "createdAt" in user &&
    typeof user.createdAt === "string" &&
    "emailVerified" in user &&
    typeof user.emailVerified === "boolean" &&
    "organization" in user &&
    !!user.organization &&
    typeof user.organization === "object" &&
    "id" in user.organization &&
    typeof user.organization.id === "string" &&
    "name" in user.organization &&
    typeof user.organization.name === "string"
  );
}

function isEmailVerificationResponse(
  data: unknown,
): data is EmailVerificationResponse {
  if (
    !data ||
    typeof data !== "object" ||
    !("message" in data) ||
    typeof data.message !== "string" ||
    !("user" in data) ||
    !data.user ||
    typeof data.user !== "object"
  ) {
    return false;
  }

  const user = data.user;
  return (
    "id" in user &&
    typeof user.id === "string" &&
    "email" in user &&
    typeof user.email === "string" &&
    "emailVerified" in user &&
    user.emailVerified === true &&
    "organizations" in user &&
    Array.isArray(user.organizations)
  );
}

function isEmailVerificationStatusResponse(
  data: unknown,
): data is EmailVerificationStatusResponse {
  if (
    !data ||
    typeof data !== "object" ||
    !("status" in data) ||
    !("emailVerified" in data)
  ) {
    return false;
  }

  return (
    (data.status === "PENDING" ||
      data.status === "EXPIRED" ||
      data.status === "VERIFIED") &&
    typeof data.emailVerified === "boolean"
  );
}

function isPasswordResetResponse(
  data: unknown,
): data is PasswordResetResponse {
  return (
    !!data &&
    typeof data === "object" &&
    "message" in data &&
    typeof data.message === "string"
  );
}
