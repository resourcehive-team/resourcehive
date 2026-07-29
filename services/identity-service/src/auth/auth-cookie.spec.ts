import { RESOURCEHIVE_ACCESS_TOKEN_COOKIE } from '@resourcehive/service-auth';
import type { Response } from 'express';
import {
  clearAccessTokenCookie,
  getAccessTokenCookieOptions,
  setAccessTokenCookie,
} from './auth-cookie';

describe('authentication cookie', () => {
  const originalNodeEnvironment = process.env.NODE_ENV;
  const originalCookieDomain = process.env.AUTH_COOKIE_DOMAIN;
  const originalCookieSecure = process.env.AUTH_COOKIE_SECURE;

  afterEach(() => {
    restoreEnvironmentVariable('NODE_ENV', originalNodeEnvironment);
    restoreEnvironmentVariable('AUTH_COOKIE_DOMAIN', originalCookieDomain);
    restoreEnvironmentVariable('AUTH_COOKIE_SECURE', originalCookieSecure);
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
      maxAge: 86_400_000,
    });
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
