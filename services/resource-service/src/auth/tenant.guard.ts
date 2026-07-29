import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@resourcehive/database';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    // Check if the route has an organizationId parameter
    const organizationId = request.params.organizationId;
    
    if (!organizationId) {
      return true; 
    }

    // Verify the user is actually a member of this organization
    const membership = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId: user.userId, organizationId } }
    });

    if (!membership || membership.status !== 'APPROVED') {
      throw new ForbiddenException('You are not an approved member of this organization.');
    }

    // Attach membership to request
    request.membership = membership;
    return true;
  }
}
