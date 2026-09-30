export interface ResourceHiveAccessTokenClaims {
  sub: string;
  email: string;
  organizationId?: string | null;
  rootOrganizationId?: string | null;
  role?: string;
  iat?: number;
  exp?: number;
}
