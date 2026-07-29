import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { extractAccessToken } from "./access-token-extractor";
import { AccessTokenVerifier } from "./access-token-verifier";
import { AuthenticatedRequest } from "./authenticated-user";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly verifier: AccessTokenVerifier) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractAccessToken(request);
    request.user = await this.verifier.verify(token);
    return true;
  }
}
