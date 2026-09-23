import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { createHash, randomBytes } from 'node:crypto';

export type GoogleFlowPurpose = 'LOGIN' | 'CONNECT';

export interface GoogleOAuthFlow {
  purpose: GoogleFlowPurpose;
  state: string;
  nonce: string;
  codeVerifier: string;
  next: string;
  userId?: string;
  exp: number;
}

export interface GoogleIdentity {
  subject: string;
  email: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class GoogleOAuthService {
  private readonly client: OAuth2Client | null;
  private readonly config: {
    clientId: string;
    callbackUrl: string;
  } | null;

  constructor() {
    if (!this.isEnabled()) {
      this.client = null;
      this.config = null;
      return;
    }

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
    const callbackUrl = process.env.GOOGLE_OAUTH_CALLBACK_URL?.trim();
    if (!clientId || !clientSecret || !callbackUrl) {
      throw new Error(
        'Google OAuth is enabled but GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_CALLBACK_URL are required',
      );
    }
    this.client = new OAuth2Client(clientId, clientSecret, callbackUrl);
    this.config = { clientId, callbackUrl };
  }

  isEnabled(): boolean {
    return (
      (process.env.GOOGLE_OAUTH_ENABLED ?? 'false').trim().toLowerCase() ===
      'true'
    );
  }

  createAuthorizationUrl(
    purpose: GoogleFlowPurpose,
    next: string,
    userId?: string,
  ): { url: string; flow: Omit<GoogleOAuthFlow, 'exp'> } {
    if (!this.client)
      throw new ServiceUnavailableException('Google sign-in is unavailable');
    const state = randomBytes(32).toString('base64url');
    const nonce = randomBytes(32).toString('base64url');
    const codeVerifier = randomBytes(48).toString('base64url');
    const codeChallenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    const flow: Omit<GoogleOAuthFlow, 'exp'> = {
      purpose,
      state,
      nonce,
      codeVerifier,
      next,
      ...(userId ? { userId } : {}),
    };
    const config = this.requireConfig();
    const query = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.callbackUrl,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      prompt: 'select_account',
    });
    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`,
      flow,
    };
  }

  async exchangeAndVerify(
    code: string,
    flow: GoogleOAuthFlow,
  ): Promise<GoogleIdentity> {
    if (!this.client)
      throw new ServiceUnavailableException('Google sign-in is unavailable');
    if (
      !code ||
      !flow.state ||
      !Number.isFinite(flow.exp) ||
      flow.exp * 1000 < Date.now()
    ) {
      throw new UnauthorizedException(
        'The Google sign-in attempt is invalid or expired',
      );
    }
    let idToken: string;
    try {
      const tokenResponse = await this.client.getToken({
        code,
        codeVerifier: flow.codeVerifier,
        redirect_uri: this.requireConfig().callbackUrl,
      });
      if (!tokenResponse.tokens.id_token) {
        throw new UnauthorizedException(
          'Google did not return an identity token',
        );
      }
      idToken = tokenResponse.tokens.id_token;
    } catch {
      throw new UnauthorizedException(
        'The Google sign-in attempt is invalid or expired',
      );
    }
    let payload: TokenPayload | undefined;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.requireConfig().clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException(
        'The Google identity could not be verified',
      );
    }
    const issuer = payload?.iss;
    if (
      !payload ||
      (issuer !== 'https://accounts.google.com' &&
        issuer !== 'accounts.google.com') ||
      !payload.sub ||
      !payload.email ||
      payload.email_verified !== true ||
      !payload.exp ||
      payload.exp * 1000 < Date.now() ||
      payload.nonce !== flow.nonce
    ) {
      throw new UnauthorizedException(
        'The Google identity could not be verified',
      );
    }
    const [firstName, lastName] = this.getNames(
      payload.given_name,
      payload.family_name,
      payload.name,
      payload.email,
    );
    return {
      subject: payload.sub,
      email: payload.email.trim().toLowerCase(),
      firstName,
      lastName,
    };
  }

  private requireConfig(): { clientId: string; callbackUrl: string } {
    if (!this.config) {
      throw new ServiceUnavailableException('Google sign-in is unavailable');
    }
    return this.config;
  }

  private getNames(
    given?: string,
    family?: string,
    full?: string,
    email?: string,
  ): [string, string] {
    const first =
      given?.trim() ||
      full?.trim().split(/\s+/)[0] ||
      email?.split('@')[0] ||
      'User';
    const last =
      family?.trim() || full?.trim().split(/\s+/).slice(1).join(' ') || '';
    return [first, last];
  }
}
