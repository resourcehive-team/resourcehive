import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/current-user.decorator';

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

  @Get('my-memberships')
  @ApiOperation({ summary: 'Get memberships for the current user' })
  getMyMemberships(@CurrentUser() user: any) {
    return this.membershipsService.getUserMemberships(user.userId);
  }

  @Get('organization/:organizationId')
  @ApiOperation({ summary: 'Get all members of an organization' })
  getOrganizationMembers(@Param('organizationId') orgId: string) {
    return this.membershipsService.getOrganizationMembers(orgId);
  }
}
