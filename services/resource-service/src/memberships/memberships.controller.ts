import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '@resourcehive/service-auth';
import type { AuthenticatedUser } from '@resourcehive/service-auth';
import { AppointChildAdminDto } from './dto/appoint-child-admin.dto';
import { RejectMembershipDto } from './dto/reject-membership.dto';
import { MembershipsService } from './memberships.service';
import {
  ChildOrganizationAdministratorsResponseDto,
  MembershipResponseDto,
} from '../docs/resource-responses.dto';

@ApiTags('Memberships')
@ApiBearerAuth()
@ApiCookieAuth('resourcehive_access_token')
@UseGuards(JwtAuthGuard)
@Controller('memberships')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Post(':organizationId/request')
  @ApiOperation({ summary: 'Request membership to an organization' })
  @ApiCreatedResponse({
    description: 'Membership request submitted successfully.',
    type: MembershipResponseDto,
  })
  requestMembership(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.membershipsService.requestMembership(
      user.userId,
      organizationId,
    );
  }

  @Patch('organization/:organizationId/users/:userId/approve')
  @ApiOperation({ summary: 'Approve or reconsider a membership request' })
  @ApiOkResponse({
    description: 'Membership approved successfully.',
    type: MembershipResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Requires a direct organization administrator.',
  })
  @ApiConflictResponse({
    description:
      'Membership was already reviewed or the applicant is inactive.',
  })
  @ApiNotFoundResponse({ description: 'Membership request not found.' })
  approveMembership(
    @Param('organizationId') organizationId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.membershipsService.updateMembershipStatus(
      targetUserId,
      organizationId,
      'APPROVED',
      user.userId,
    );
  }

  @Patch('organization/:organizationId/users/:userId/reject')
  @ApiOperation({ summary: 'Reject a pending membership request' })
  @ApiOkResponse({
    description: 'Membership rejected successfully.',
    type: MembershipResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Requires a direct organization administrator.',
  })
  @ApiConflictResponse({
    description: 'Only pending memberships can be rejected.',
  })
  @ApiNotFoundResponse({ description: 'Membership request not found.' })
  rejectMembership(
    @Param('organizationId') organizationId: string,
    @Param('userId') targetUserId: string,
    @Body() body: RejectMembershipDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.membershipsService.updateMembershipStatus(
      targetUserId,
      organizationId,
      'REJECTED',
      user.userId,
      body.reason,
    );
  }

  @Get('my-memberships')
  @ApiOperation({ summary: 'Get memberships for the current user' })
  @ApiOkResponse({
    description: "Returns all of the user's membership statuses.",
    type: [MembershipResponseDto],
  })
  getMyMemberships(@CurrentUser() user: AuthenticatedUser) {
    return this.membershipsService.getUserMemberships(user.userId);
  }

  @Get('organization/:organizationId/child-administrators')
  @ApiOperation({
    summary: 'Get administrators for immediate child organizations',
  })
  @ApiOkResponse({
    description:
      'Returns immediate child organizations and their administrators.',
    type: [ChildOrganizationAdministratorsResponseDto],
  })
  getChildAdministrators(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.membershipsService.getChildAdministrators(
      organizationId,
      user.userId,
    );
  }

  @Put(
    'organization/:organizationId/children/:childOrganizationId/administrators',
  )
  @ApiOperation({
    summary: 'Appoint an administrator for an immediate child organization',
  })
  @ApiOkResponse({
    description: 'Child administrator appointed successfully.',
    type: MembershipResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Requires a direct administrator of the parent organization.',
  })
  appointChildAdministrator(
    @Param('organizationId') parentOrganizationId: string,
    @Param('childOrganizationId') childOrganizationId: string,
    @Body() body: AppointChildAdminDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.membershipsService.appointChildAdministrator(
      parentOrganizationId,
      childOrganizationId,
      body.email,
      user.userId,
    );
  }

  @Delete(
    'organization/:organizationId/children/:childOrganizationId/administrators/:userId',
  )
  @ApiOperation({
    summary: 'Revoke an administrator for an immediate child organization',
  })
  @ApiOkResponse({
    description: 'Child administrator revoked successfully.',
    type: MembershipResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Requires a direct administrator of the parent organization.',
  })
  revokeChildAdministrator(
    @Param('organizationId') parentOrganizationId: string,
    @Param('childOrganizationId') childOrganizationId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.membershipsService.revokeChildAdministrator(
      parentOrganizationId,
      childOrganizationId,
      targetUserId,
      user.userId,
    );
  }

  @Get('organization/:organizationId')
  @ApiOperation({ summary: 'Get all members of an organization' })
  @ApiOkResponse({
    description: 'Returns members and membership requests.',
    type: [MembershipResponseDto],
  })
  @ApiForbiddenResponse({
    description: 'Requires a direct organization administrator.',
  })
  getOrganizationMembers(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.membershipsService.getOrganizationMembers(
      organizationId,
      user.userId,
    );
  }

  @Delete('organization/:organizationId/users/:userId')
  @ApiOperation({ summary: 'Remove a user from the organization' })
  @ApiOkResponse({
    description: 'User removed successfully.',
    type: MembershipResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Requires a direct organization administrator.',
  })
  removeMembership(
    @Param('organizationId') organizationId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.membershipsService.removeMembership(
      targetUserId,
      organizationId,
      user.userId,
    );
  }

  @Patch('organization/:organizationId/users/:userId/role')
  @ApiOperation({ summary: 'Update a user role' })
  @ApiOkResponse({
    description: 'User role updated successfully.',
    type: MembershipResponseDto,
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['role'],
      properties: { role: { type: 'string', enum: ['MEMBER', 'ADMIN'] } },
    },
  })
  @ApiForbiddenResponse({
    description: 'Requires a direct organization administrator.',
  })
  updateMembershipRole(
    @Param('organizationId') organizationId: string,
    @Param('userId') targetUserId: string,
    @Body('role') role: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.membershipsService.updateMembershipRole(
      targetUserId,
      organizationId,
      role,
      user.userId,
    );
  }
}
