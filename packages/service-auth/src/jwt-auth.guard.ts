import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AccessTokenVerifier } from "./access-token-verifier";
import { AuthenticatedRequest } from "./authenticated-user";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly verifier: AccessTokenVerifier) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request.headers.authorization);
    request.user = await this.verifier.verify(token);
    return true;
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
}
