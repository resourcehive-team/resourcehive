import { CacheInterceptor } from "@nestjs/cache-manager";
import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthenticatedRequest } from "@resourcehive/service-auth";

@Injectable()
export class UserCacheInterceptor extends CacheInterceptor {
  async trackBy(context: ExecutionContext): Promise<string | undefined> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.userId;

    // Get the default cache key (the URL)
    const url = await super.trackBy(context);

    if (!url) {
      return undefined;
    }

    // Append the userId to make the cache unique per user
    if (userId) {
      return `${url}-${userId}`;
    }

    return url;
  }
}
