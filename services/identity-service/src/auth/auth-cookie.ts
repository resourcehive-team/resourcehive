import { RESOURCEHIVE_ACCESS_TOKEN_COOKIE } from '@resourcehive/service-auth';
import type { CookieOptions, Response } from 'express';

const ACCESS_TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

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
    getSharedCookieOptions(),
  );
}

export function getAccessTokenCookieOptions(): CookieOptions {
  return {
    ...getSharedCookieOptions(),
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
  };
}

function getSharedCookieOptions(): CookieOptions {
  const domain = process.env.AUTH_COOKIE_DOMAIN?.trim();

  return {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: 'lax',
    path: '/',
    ...(domain ? { domain } : {}),
  };
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
