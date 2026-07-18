import { identityApiUrl } from "@/lib/config"

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  message: "user login successfully"
  token: string
}

export class LoginError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "LoginError"
  }
}

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  let response: Response

  try {
    response = await fetch(`${identityApiUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    })
  } catch {
    throw new LoginError("Unable to connect to the login service.")
  }

  if (!response.ok) {
    if (response.status === 400 || response.status === 404) {
      throw new LoginError("Email or password is incorrect.")
    }

    throw new LoginError("Unable to log in. Please try again.")
  }

  const data: unknown = await response.json().catch(() => null)

  if (
    !data ||
    typeof data !== "object" ||
    !("message" in data) ||
    data.message !== "user login successfully" ||
    !("token" in data) ||
    typeof data.token !== "string"
  ) {
    throw new LoginError("The login service returned an invalid response.")
  }

  return {
    message: "user login successfully",
    token: data.token,
  }
}
