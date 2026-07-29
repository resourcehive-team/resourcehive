export interface AuthenticatedUser {
  userId: string;
  email: string;
  organizationId: string | null;
  role: string | null;
}

export interface AuthenticatedRequest {
  headers: {
    authorization?: string | string[];
  };
  user?: AuthenticatedUser;
}
