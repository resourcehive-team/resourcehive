import { Controller, Get, Post, Param, UseGuards, Patch } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '@resourcehive/service-auth';
import type { AuthenticatedUser } from '@resourcehive/service-auth';
import { TenantGuard } from '../auth/tenant.guard';
import { AdminGuard } from '../auth/admin.guard';

@ApiTags('Memberships')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('memberships')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Post(':organizationId/request')
  @ApiOperation({ summary: 'Request membership to an organization' })
  @ApiCreatedResponse({
    description: 'Membership request submitted successfully.',
  })
  requestMembership(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.membershipsService.requestMembership(user.userId, orgId);
  }

  @UseGuards(TenantGuard, AdminGuard)
  @Patch('organization/:organizationId/users/:userId/approve')
  @ApiOperation({ summary: 'Approve a membership request' })
  @ApiOkResponse({ description: 'Membership approved successfully.' })
  @ApiForbiddenResponse({
    description: 'Forbidden. Requires Admin privileges.',
  })
  @ApiNotFoundResponse({ description: 'Membership request not found.' })
  approveMembership(
    @Param('organizationId') orgId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.membershipsService.updateMembershipStatus(
      targetUserId,
      orgId,
      'APPROVED',
      user.userId,
    );
  }

  @UseGuards(TenantGuard, AdminGuard)
  @Patch('organization/:organizationId/users/:userId/reject')
  @ApiOperation({ summary: 'Reject a membership request' })
  @ApiOkResponse({ description: 'Membership rejected successfully.' })
  @ApiForbiddenResponse({
    description: 'Forbidden. Requires Admin privileges.',
  })
  @ApiNotFoundResponse({ description: 'Membership request not found.' })
  rejectMembership(
    @Param('organizationId') orgId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.membershipsService.updateMembershipStatus(
      targetUserId,
      orgId,
      'REJECTED',
      user.userId,
    );
  }

  @Get('my-memberships')
  @ApiOperation({ summary: 'Get memberships for the current user' })
  @ApiOkResponse({ description: "Returns a list of the user's memberships." })
  getMyMemberships(@CurrentUser() user: AuthenticatedUser) {
    return this.membershipsService.getUserMemberships(user.userId);
  }

  @UseGuards(TenantGuard, AdminGuard)
  @Get('organization/:organizationId')
  @ApiOperation({ summary: 'Get all members of an organization' })
  @ApiOkResponse({ description: 'Returns a list of approved members.' })
  @ApiForbiddenResponse({
    description: 'Forbidden. Requires Admin privileges.',
  })
  getOrganizationMembers(@Param('organizationId') orgId: string) {
    return this.membershipsService.getOrganizationMembers(orgId);
  }
}
