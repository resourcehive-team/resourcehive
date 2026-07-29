import { CanActivate, ExecutionContext, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
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

    if (membership && membership.status === 'APPROVED') {
      request.membership = membership; // attach membership to the request
      return true;
    }

    // Check inherited admin access
    const targetOrg = await this.prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!targetOrg) {
      throw new ForbiddenException('You do not have access to this organization.');
    }

    // check if user an admin of the root organization
    if (targetOrg.rootOrganizationId !== organizationId) {
      const rootMembership = await this.prisma.organizationMembership.findUnique({
        where: { userId_organizationId: { userId: user.userId, organizationId: targetOrg.rootOrganizationId } }
      });

      if (rootMembership && rootMembership.status === 'APPROVED' && rootMembership.role === 'ADMIN') {
        request.membership = rootMembership; 
        return true;
      }
    }

    // check if user an admin of the immediate parent organization
    if (targetOrg.parentId) {
      const parentMembership = await this.prisma.organizationMembership.findUnique({
        where: { userId_organizationId: { userId: user.userId, organizationId: targetOrg.parentId } }
      });
      if (parentMembership && parentMembership.status === 'APPROVED' && parentMembership.role === 'ADMIN') {
        request.membership = parentMembership;
        return true;
      }
    }
    

    throw new ForbiddenException('You do not have access to this organization.');

  }
  
}
