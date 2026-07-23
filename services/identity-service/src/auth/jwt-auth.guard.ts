import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '@resourcehive/database';
import { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
}

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token not found or invalid format');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    try {
      const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
      const key =
        process.env.SUPABASE_ANON_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!url || !key) {
        throw new Error('Supabase environment is not configured');
      }

      const response = await fetch(`${url}/auth/v1/user`, {
        headers: { apikey: key, Authorization: `Bearer ${token}` },
      });
      const authUser = (await response.json()) as {
        id?: string;
        email?: string;
      };
      if (!response.ok || !authUser.id) {
        throw new Error('Invalid Supabase access token');
      }

      const membership = await this.prisma.tenant_membership.findFirst({
        where: { person_id: authUser.id, status: 'active' },
        orderBy: { joined_at: 'asc' },
      });
      request.user = {
        userId: authUser.id,
        tenantId: membership?.tenant_id ?? '',
        role: membership?.role ?? 'member',
        email: authUser.email ?? '',
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return true;
  }
}
