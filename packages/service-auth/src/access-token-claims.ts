export interface ResourceHiveAccessTokenClaims {
  sub: string;
  email: string;
  organizationId?: string | null;
  role?: string;
  iat?: number;
  exp?: number;
}
