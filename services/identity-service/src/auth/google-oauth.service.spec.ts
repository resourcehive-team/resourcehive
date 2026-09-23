import { ServiceUnavailableException } from '@nestjs/common';
import { GoogleOAuthService } from './google-oauth.service';

describe('GoogleOAuthService', () => {
  const original = {
    enabled: process.env.GOOGLE_OAUTH_ENABLED,
    id: process.env.GOOGLE_OAUTH_CLIENT_ID,
    secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    callback: process.env.GOOGLE_OAUTH_CALLBACK_URL,
  };

  afterEach(() => {
    process.env.GOOGLE_OAUTH_ENABLED = original.enabled;
    process.env.GOOGLE_OAUTH_CLIENT_ID = original.id;
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = original.secret;
    process.env.GOOGLE_OAUTH_CALLBACK_URL = original.callback;
  });

  it('keeps the provider disabled without credentials', () => {
    delete process.env.GOOGLE_OAUTH_ENABLED;
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    delete process.env.GOOGLE_OAUTH_CALLBACK_URL;
    const service = new GoogleOAuthService();
    expect(service.isEnabled()).toBe(false);
    expect(() => service.createAuthorizationUrl('LOGIN', '/dashboard')).toThrow(
      ServiceUnavailableException,
    );
  });

  it('creates a stateful PKCE authorization URL when enabled', () => {
    process.env.GOOGLE_OAUTH_ENABLED = 'true';
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'client-id';
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'client-secret';
    process.env.GOOGLE_OAUTH_CALLBACK_URL =
      'http://localhost:8088/auth/google/callback';
    const service = new GoogleOAuthService();
    const result = service.createAuthorizationUrl('LOGIN', '/dashboard');
    const url = new URL(result.url);
    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBe(result.flow.state);
    expect(url.searchParams.get('nonce')).toBe(result.flow.nonce);
    expect(result.flow.codeVerifier.length).toBeGreaterThan(40);
  });

  it('fails startup with an actionable error for incomplete configuration', () => {
    process.env.GOOGLE_OAUTH_ENABLED = 'true';
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'client-secret';
    process.env.GOOGLE_OAUTH_CALLBACK_URL =
      'http://localhost:8088/auth/google/callback';
    expect(() => new GoogleOAuthService()).toThrow(/GOOGLE_OAUTH_CLIENT_ID/);
  });
});
