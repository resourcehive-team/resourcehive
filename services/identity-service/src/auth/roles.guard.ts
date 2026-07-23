import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from './jwt-auth.guard';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // get required roles from our custom @Roles decorator
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // if no roles are required, allow access
    if (!requiredRoles) {
      return true;
    }

    // get user  from request
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();

    //check user has one of the required roles
    const hasRole = user ? requiredRoles.includes(user.role) : false;

    if (!hasRole) {
      throw new ForbiddenException('You do not have the required permissions');
    }

    return true;
  }
}
