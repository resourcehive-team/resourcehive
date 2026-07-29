import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ResourceHiveAccessTokenClaims } from "./access-token-claims";
import { AuthenticatedUser } from "./authenticated-user";

@Injectable()
export class AccessTokenVerifier {
  constructor(private readonly jwtService: JwtService) {}

  async verify(token: string): Promise<AuthenticatedUser> {
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
      return this.toAuthenticatedUser(claims);
    } catch {
      throw new UnauthorizedException(
        "Invalid or expired authentication token",
      );
    }
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
