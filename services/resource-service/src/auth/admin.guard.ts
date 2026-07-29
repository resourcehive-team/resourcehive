import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    // TenantGuard must run first to attach the membership to the request
    const membership = request.membership;
    
    if (!membership) {
       throw new ForbiddenException('No membership context found. TenantGuard must be applied first.');
    }

    if (membership.role !== 'ADMIN') {
      throw new ForbiddenException('Administrator privileges are required to perform this action.');
    }

    return true;
  }
}
