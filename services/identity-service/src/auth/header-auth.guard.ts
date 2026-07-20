import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class HeaderAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    // The API Gateway will inject these headers if the JWT is valid
    const userId = request.headers['x-user-id'];
    const tenantId = request.headers['x-tenant-id'];
    const role = request.headers['x-user-role'];
    const email = request.headers['x-user-email'];

    if (!userId) {
      throw new UnauthorizedException('Missing user identity headers from Gateway');
    }

    // Reconstruct the user object so the rest of the app (like RolesGuard) 
    // doesn't even know the JWT is gone!
    request.user = {
      userId,
      tenantId,
      role,
      email
    };

    return true;
  }
}
