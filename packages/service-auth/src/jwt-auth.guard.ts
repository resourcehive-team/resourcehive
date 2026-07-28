import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ResourceHiveAccessTokenClaims } from "./access-token-claims";
import { AuthenticatedRequest, AuthenticatedUser } from "./authenticated-user";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request.headers.authorization);
    const secret = this.getJwtSecret();

    try {
      const claims =
        await this.jwtService.verifyAsync<ResourceHiveAccessTokenClaims>(
          token,
          {
            secret,
            algorithms: ["HS256"],
          },
        );

      request.user = this.toAuthenticatedUser(claims);
      return true;
    } catch {
      throw new UnauthorizedException(
        "Invalid or expired authentication token",
      );
    }
  }

  private extractToken(authorization: string | string[] | undefined): string {
    if (typeof authorization !== "string") {
      throw new UnauthorizedException("Authentication token is required");
    }

    const match = authorization.match(/^Bearer\s+(\S+)$/i);
    if (!match?.[1]) {
      throw new UnauthorizedException("Authentication token is required");
    }

    return match[1];
  }

  private getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret === "change_me") {
      throw new InternalServerErrorException("JWT_SECRET must be configured");
    }
    return secret;
  }

  private toAuthenticatedUser(
    claims: ResourceHiveAccessTokenClaims,
  ): AuthenticatedUser {
    if (
      typeof claims.sub !== "string" ||
      !claims.sub ||
      typeof claims.email !== "string" ||
      !claims.email
    ) {
      throw new UnauthorizedException(
        "Invalid or expired authentication token",
      );
    }

    return {
      userId: claims.sub,
      email: claims.email,
      organizationId:
        typeof claims.organizationId === "string"
          ? claims.organizationId
          : null,
      role: typeof claims.role === "string" ? claims.role : null,
    };
  }
}
