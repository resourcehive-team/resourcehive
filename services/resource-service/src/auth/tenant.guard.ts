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

    // Verify if the user has a direct membership to this organization
    const directMembership = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId: user.userId, organizationId } }
    });
    
    const bestMembership = (directMembership && directMembership.status === 'APPROVED') ? directMembership : null;

    // If the direct membership is ADMIN, they have the highest access, so return immediately
    if (bestMembership && bestMembership.role === 'ADMIN') {
      request.membership = bestMembership;
      return true;
    }

    // Otherwise, check inherited admin access up to the root
    const targetOrg = await this.prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!targetOrg) {
      if (bestMembership) {
        request.membership = bestMembership;
        return true;
      }
      throw new ForbiddenException('You do not have access to this organization.');
    }

    // Trace ancestors up to the root to find an inherited ADMIN membership
    let currentOrgId: string | null = targetOrg.parentId;

    while (currentOrgId) {
      // Fetch the current ancestor organization to ensure we stay within the tenant
      const currentOrg = await this.prisma.organization.findUnique({
        where: { id: currentOrgId }
      });

      // Break if org is missing or if we somehow cross tenant boundaries
      if (!currentOrg || currentOrg.rootOrganizationId !== targetOrg.rootOrganizationId) {
        break;
      }

      // Check if user is an ADMIN of this ancestor organization
      const ancestorMembership = await this.prisma.organizationMembership.findUnique({
        where: { userId_organizationId: { userId: user.userId, organizationId: currentOrgId } }
      });

      if (ancestorMembership && ancestorMembership.status === 'APPROVED' && ancestorMembership.role === 'ADMIN') {
        request.membership = ancestorMembership;
        return true;
      }

      // Move up to the next parent
      currentOrgId = currentOrg.parentId;
    }
    
    // If no inherited admin was found, but they have a direct non-admin membership, use that
    if (bestMembership) {
      request.membership = bestMembership;
      return true;
    }

    throw new ForbiddenException('You do not have access to this organization.');

  }
  
}
