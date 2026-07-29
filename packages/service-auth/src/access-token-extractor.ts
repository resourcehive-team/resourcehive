import { UnauthorizedException } from "@nestjs/common";

export const RESOURCEHIVE_ACCESS_TOKEN_COOKIE = "resourcehive_access_token";

interface AccessTokenRequest {
  headers: {
    authorization?: string | string[];
    cookie?: string | string[];
  };
  cookies?: Record<string, unknown>;
}

export function extractAccessToken(request: AccessTokenRequest): string {
  const authorization = request.headers.authorization;

  if (typeof authorization === "string") {
    const match = authorization.match(/^Bearer\s+(\S+)$/i);
    if (!match?.[1]) {
      throw new UnauthorizedException("Authentication token is required");
    }

    return match[1];
  }

  const parsedCookie = request.cookies?.[RESOURCEHIVE_ACCESS_TOKEN_COOKIE];
  if (typeof parsedCookie === "string" && parsedCookie) {
    return parsedCookie;
  }

  const cookieHeader = request.headers.cookie;
  if (typeof cookieHeader === "string") {
    const token = findCookie(cookieHeader, RESOURCEHIVE_ACCESS_TOKEN_COOKIE);
    if (token) {
      return token;
    }
  }

  throw new UnauthorizedException("Authentication token is required");
}

function findCookie(cookieHeader: string, name: string): string | null {
  for (const cookie of cookieHeader.split(";")) {
    const separatorIndex = cookie.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const cookieName = cookie.slice(0, separatorIndex).trim();
    if (cookieName !== name) {
      continue;
    }

    const value = cookie.slice(separatorIndex + 1).trim();
    if (!value) {
      return null;
    }

    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return null;
}
