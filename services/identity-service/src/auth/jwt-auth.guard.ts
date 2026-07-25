import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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

interface AccessTokenPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret === 'change_me') {
      throw new Error('JWT_SECRET is not configured');
    }
    return secret;
  }

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
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        token,
        {
          secret: this.getJwtSecret(),
        },
      );
      const user = await this.prisma.user.findUnique({
        where: {
          id: payload.sub,
          status: 'ACTIVE',
        },
      });

      if (!user) {
        throw new Error('User is not active');
      }

      const membership = await this.prisma.organizationMembership.findFirst({
        where: {
          userId: user.id,
          status: 'APPROVED',
        },
        orderBy: { joinedAt: 'asc' },
      });

      request.user = {
        userId: user.id,
        tenantId: membership?.organizationId ?? '',
        role: membership?.role.toLowerCase() ?? 'member',
        email: user.email,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return true;
  }
}
