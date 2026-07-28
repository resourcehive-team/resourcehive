import { identityApiUrl } from "@/lib/config";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: "user login successfully";
  token: string;
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

export class LoginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LoginError";
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

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  let response: Response;

  try {
    response = await fetch(`${identityApiUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });
  } catch {
    throw new LoginError("Unable to connect to the login service.");
  }

  if (!response.ok) {
    if (
      response.status === 400 ||
      response.status === 401 ||
      response.status === 404
    ) {
      throw new LoginError("Email or password is incorrect.");
    }

    throw new LoginError("Unable to log in. Please try again.");
  }

  const data: unknown = await response.json().catch(() => null);

  if (
    !data ||
    typeof data !== "object" ||
    !("message" in data) ||
    data.message !== "user login successfully" ||
    !("token" in data) ||
    typeof data.token !== "string"
  ) {
    throw new LoginError("The login service returned an invalid response.");
  }

  return {
    message: "user login successfully",
    token: data.token,
  };
}

export async function register(
  registration: RegistrationRequest,
): Promise<RegistrationResponse> {
  let response: Response;

  try {
    response = await fetch(`${identityApiUrl}/auth/register`, {
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
    response = await fetch(`${identityApiUrl}/auth/verify-email`, {
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
