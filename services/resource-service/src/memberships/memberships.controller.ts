import { Controller, Get, Post, Param, UseGuards, Patch } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/current-user.decorator';
import { TenantGuard } from '../auth/tenant.guard';
import { AdminGuard } from '../auth/admin.guard';

@ApiTags('Memberships')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('memberships')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Post(':organizationId/request')
  @ApiOperation({ summary: 'Request membership to an organization' })
  requestMembership(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: any,
  ) {
    return this.membershipsService.requestMembership(user.userId, orgId);
  }

  @UseGuards(TenantGuard, AdminGuard)
  @Patch('organization/:organizationId/users/:userId/approve')
  @ApiOperation({ summary: 'Approve a membership request' })
  approveMembership(
    @Param('organizationId') orgId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: any
  ) {
    return this.membershipsService.updateMembershipStatus(targetUserId, orgId, 'APPROVED', user.userId);
  }

  @UseGuards(TenantGuard, AdminGuard)
  @Patch('organization/:organizationId/users/:userId/reject')
  @ApiOperation({ summary: 'Reject a membership request' })
  rejectMembership(
    @Param('organizationId') orgId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: any
  ) {
    return this.membershipsService.updateMembershipStatus(targetUserId, orgId, 'REJECTED', user.userId);
  }

  @Get('my-memberships')
  @ApiOperation({ summary: 'Get memberships for the current user' })
  getMyMemberships(@CurrentUser() user: any) {
    return this.membershipsService.getUserMemberships(user.userId);
  }

  @UseGuards(TenantGuard, AdminGuard)
  @Get('organization/:organizationId')
  @ApiOperation({ summary: 'Get all members of an organization' })
  getOrganizationMembers(@Param('organizationId') orgId: string) {
    return this.membershipsService.getOrganizationMembers(orgId);
  }
}
