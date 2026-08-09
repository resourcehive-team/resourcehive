import { RESOURCEHIVE_ACCESS_TOKEN_COOKIE } from '@resourcehive/service-auth';
import type { Response } from 'express';
import {
  clearAuthenticationCookies,
  clearAccessTokenCookie,
  extractRefreshToken,
  getAccessTokenCookieOptions,
  RESOURCEHIVE_REFRESH_TOKEN_COOKIE,
  setAccessTokenCookie,
  setRefreshTokenCookie,
} from './auth-cookie';

describe('authentication cookie', () => {
  const originalNodeEnvironment = process.env.NODE_ENV;
  const originalCookieDomain = process.env.AUTH_COOKIE_DOMAIN;
  const originalCookieSecure = process.env.AUTH_COOKIE_SECURE;
  const originalJwtLifetime = process.env.JWT_EXPIRES_IN;

  afterEach(() => {
    restoreEnvironmentVariable('NODE_ENV', originalNodeEnvironment);
    restoreEnvironmentVariable('AUTH_COOKIE_DOMAIN', originalCookieDomain);
    restoreEnvironmentVariable('AUTH_COOKIE_SECURE', originalCookieSecure);
    restoreEnvironmentVariable('JWT_EXPIRES_IN', originalJwtLifetime);
  });

  it('uses development-safe settings without widening the cookie domain', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.AUTH_COOKIE_DOMAIN;
    delete process.env.AUTH_COOKIE_SECURE;

    expect(getAccessTokenCookieOptions()).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 900_000,
    });
  });

  it('restricts the refresh cookie to Identity routes', () => {
    process.env.AUTH_COOKIE_SECURE = 'false';
    const cookie = jest.fn();
    const response = { cookie } as unknown as Response;
    const expiresAt = new Date(Date.now() + 60_000);

    setRefreshTokenCookie(response, 'refresh-token', expiresAt);

    expect(cookie).toHaveBeenCalledWith(
      RESOURCEHIVE_REFRESH_TOKEN_COOKIE,
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/auth',
        expires: expiresAt,
      }),
    );
  });

  it('supports secure cookies shared by ResourceHive subdomains', () => {
    process.env.AUTH_COOKIE_DOMAIN = '.resourcehive.com';
    process.env.AUTH_COOKIE_SECURE = 'true';

    expect(getAccessTokenCookieOptions()).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      domain: '.resourcehive.com',
    });
  });

  it('clears access and refresh cookies using their original paths', () => {
    const clearCookie = jest.fn();
    const response = { clearCookie } as unknown as Response;

    clearAuthenticationCookies(response);

    expect(clearCookie).toHaveBeenCalledWith(
      RESOURCEHIVE_ACCESS_TOKEN_COOKIE,
      expect.objectContaining({ path: '/' }),
    );
    expect(clearCookie).toHaveBeenCalledWith(
      RESOURCEHIVE_REFRESH_TOKEN_COOKIE,
      expect.objectContaining({ path: '/auth' }),
    );
  });

  it('extracts the refresh token from the raw cookie header', () => {
    const request = {
      headers: {
        cookie: `other=value; ${RESOURCEHIVE_REFRESH_TOKEN_COOKIE}=refresh%20token`,
      },
    };

    expect(extractRefreshToken(request as never)).toBe('refresh token');
  });

  it('sets and clears the same authentication cookie', () => {
    process.env.AUTH_COOKIE_SECURE = 'false';
    const cookie = jest.fn();
    const clearCookie = jest.fn();
    const response = {
      cookie,
      clearCookie,
    } as unknown as Response;

    setAccessTokenCookie(response, 'signed-token');
    clearAccessTokenCookie(response);

    expect(cookie).toHaveBeenCalledWith(
      RESOURCEHIVE_ACCESS_TOKEN_COOKIE,
      'signed-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      }),
    );
    expect(clearCookie).toHaveBeenCalledWith(
      RESOURCEHIVE_ACCESS_TOKEN_COOKIE,
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      }),
    );
  });
});

function restoreEnvironmentVariable(
  name: string,
  value: string | undefined,
): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
