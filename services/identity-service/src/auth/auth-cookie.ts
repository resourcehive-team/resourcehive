import { RESOURCEHIVE_ACCESS_TOKEN_COOKIE } from '@resourcehive/service-auth';
import type { CookieOptions, Request, Response } from 'express';

export const RESOURCEHIVE_REFRESH_TOKEN_COOKIE = 'resourcehive_refresh_token';
const DEFAULT_ACCESS_TOKEN_LIFETIME = '15m';

export function setAccessTokenCookie(response: Response, token: string): void {
  response.cookie(
    RESOURCEHIVE_ACCESS_TOKEN_COOKIE,
    token,
    getAccessTokenCookieOptions(),
  );
}

export function clearAccessTokenCookie(response: Response): void {
  response.clearCookie(
    RESOURCEHIVE_ACCESS_TOKEN_COOKIE,
    getSharedCookieOptions('/'),
  );
}

export function setRefreshTokenCookie(
  response: Response,
  token: string,
  expiresAt: Date,
): void {
  response.cookie(RESOURCEHIVE_REFRESH_TOKEN_COOKIE, token, {
    ...getSharedCookieOptions('/auth'),
    expires: expiresAt,
  });
}

export function clearRefreshTokenCookie(response: Response): void {
  response.clearCookie(
    RESOURCEHIVE_REFRESH_TOKEN_COOKIE,
    getSharedCookieOptions('/auth'),
  );
}

export function clearAuthenticationCookies(response: Response): void {
  clearAccessTokenCookie(response);
  clearRefreshTokenCookie(response);
}

export function extractRefreshToken(request: Request): string | null {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) {
    return null;
  }

  for (const cookie of cookieHeader.split(';')) {
    const separatorIndex = cookie.indexOf('=');
    if (separatorIndex === -1) continue;

    const name = cookie.slice(0, separatorIndex).trim();
    if (name !== RESOURCEHIVE_REFRESH_TOKEN_COOKIE) continue;

    const value = cookie.slice(separatorIndex + 1).trim();
    if (!value) return null;

    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return null;
}

export function getAccessTokenCookieOptions(): CookieOptions {
  return {
    ...getSharedCookieOptions('/'),
    maxAge: parseLifetimeMs(
      process.env.JWT_EXPIRES_IN ?? DEFAULT_ACCESS_TOKEN_LIFETIME,
      'JWT_EXPIRES_IN',
    ),
  };
}

function getSharedCookieOptions(path: string): CookieOptions {
  const domain = process.env.AUTH_COOKIE_DOMAIN?.trim();

  return {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: 'lax',
    path,
    ...(domain ? { domain } : {}),
  };
}

function parseLifetimeMs(value: string, environmentName: string): number {
  const match = value.match(/^(\d+)(m|h|d)$/);
  if (!match) {
    throw new Error(`${environmentName} must use m, h, or d`);
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const unitMilliseconds = {
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }[unit];

  return amount * unitMilliseconds;
}

function isSecureCookie(): boolean {
  const configuredValue = process.env.AUTH_COOKIE_SECURE?.trim().toLowerCase();

  if (configuredValue === 'true') {
    return true;
  }

  if (configuredValue === 'false') {
    return false;
  }

  return process.env.NODE_ENV === 'production';
}
