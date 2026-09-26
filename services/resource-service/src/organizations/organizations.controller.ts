import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiBody,
  ApiOkResponse,
  ApiForbiddenResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '@resourcehive/service-auth';
import type { AuthenticatedUser } from '@resourcehive/service-auth';
import { TenantGuard } from '../auth/tenant.guard';
import { AdminGuard } from '../auth/admin.guard';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AllocateSemesterPointsDto } from './dto/allocate-semester-points.dto';
import {
  CountResponseDto,
  OrganizationAllowlistResponseDto,
  OrganizationEmailDomainResponseDto,
  OrganizationResponseDto,
} from '../docs/resource-responses.dto';

@ApiTags('Organizations')
@ApiBearerAuth()
@ApiCookieAuth('resourcehive_access_token')
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Get('roots')
  @ApiOperation({ summary: 'Get all root organizations (Tenants)' })
  @ApiOkResponse({
    description: 'Returns a list of root organizations.',
    type: [OrganizationResponseDto],
  })
  getRoots() {
    return this.orgsService.findAllRoots();
  }

  @Get(':organizationId')
  @ApiOperation({ summary: 'Get organization details' })
  @ApiOkResponse({
    description: 'Returns the organization details.',
    type: OrganizationResponseDto,
  })
  getOne(@Param('organizationId') organizationId: string) {
    return this.orgsService.findOne(organizationId);
  }

  @Get(':organizationId/children')
  @ApiOperation({ summary: 'Get child organizations for a root tenant' })
  @ApiOkResponse({
    description: 'Returns a list of child organizations.',
    type: [OrganizationResponseDto],
  })
  getChildren(@Param('organizationId') organizationId: string) {
    return this.orgsService.findChildren(organizationId);
  }

  @UseGuards(TenantGuard, AdminGuard)
  @Get(':organizationId/email-domains')
  @ApiOperation({ summary: 'Get email domains for an organization' })
  @ApiOkResponse({
    description: 'Returns a list of email domains for the organization.',
    type: [OrganizationEmailDomainResponseDto],
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. Requires Admin privileges.',
  })
  getEmailDomains(@Param('organizationId') orgId: string) {
    return this.orgsService.getEmailDomains(orgId);
  }

  @UseGuards(TenantGuard, AdminGuard)
  @Post(':organizationId/email-domains')
  @ApiOperation({ summary: 'Add an email domain' })
  @ApiCreatedResponse({
    description: 'Email domain added successfully.',
    type: OrganizationEmailDomainResponseDto,
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['domain'],
      properties: {
        domain: { type: 'string', example: 'cse.mrt.ac.lk' },
        autoJoin: { type: 'boolean', default: false },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. Requires Admin privileges.',
  })
  addEmailDomain(
    @Param('organizationId') orgId: string,
    @Body('domain') domain: string,
    @Body('autoJoin') autoJoin?: boolean,
  ) {
    return this.orgsService.addEmailDomain(orgId, domain, autoJoin);
  }

  @UseGuards(TenantGuard, AdminGuard)
  @Delete(':organizationId/email-domains/:domainId')
  @ApiOperation({ summary: 'Remove an email domain' })
  @ApiOkResponse({
    description: 'Email domain removed successfully.',
    type: OrganizationEmailDomainResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. Requires Admin privileges.',
  })
  removeEmailDomain(
    @Param('organizationId') orgId: string,
    @Param('domainId') domainId: string,
  ) {
    return this.orgsService.removeEmailDomain(orgId, domainId);
  }

  @UseGuards(TenantGuard, AdminGuard)
  @Get(':organizationId/allowlist')
  @ApiOperation({ summary: 'Get allowlist for an organization' })
  @ApiOkResponse({
    description: 'Returns the allowlist for the organization.',
    type: [OrganizationAllowlistResponseDto],
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. Requires Admin privileges.',
  })
  getAllowlist(@Param('organizationId') orgId: string) {
    return this.orgsService.getAllowlist(orgId);
  }

  @UseGuards(TenantGuard, AdminGuard)
  @Post(':organizationId/allowlist')
  @ApiOperation({ summary: 'Add email to allowlist' })
  @ApiCreatedResponse({
    description: 'Email added to allowlist successfully.',
    type: OrganizationAllowlistResponseDto,
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'student@example.edu',
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. Requires Admin privileges.',
  })
  addToAllowlist(
    @Param('organizationId') orgId: string,
    @Body('email') email: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orgsService.addToAllowlist(orgId, email, user.userId);
  }

  @UseGuards(TenantGuard, AdminGuard)
  @Delete(':organizationId/allowlist/:allowlistId')
  @ApiOperation({ summary: 'Remove email from allowlist' })
  @ApiOkResponse({
    description: 'Email removed from allowlist successfully.',
    type: OrganizationAllowlistResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. Requires Admin privileges.',
  })
  removeFromAllowlist(
    @Param('organizationId') orgId: string,
    @Param('allowlistId') allowlistId: string,
  ) {
    return this.orgsService.removeFromAllowlist(orgId, allowlistId);
  }

  @UseGuards(TenantGuard, AdminGuard)
  @Patch(':organizationId')
  @ApiOperation({ summary: 'Update organization details or status' })
  @ApiOkResponse({
    description: 'Organization updated successfully.',
    type: OrganizationResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. Requires Admin privileges.',
  })
  update(
    @Param('organizationId') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return this.orgsService.update(id, updateOrganizationDto);
  }

  @UseGuards(TenantGuard, AdminGuard)
  @Post(':organizationId/semester-points')
  @ApiOperation({
    summary:
      'Allocate semester points to all active members of a target organization',
  })
  @ApiCreatedResponse({
    description: 'Points allocated successfully.',
    type: CountResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. Requires Admin privileges.',
  })
  allocateSemesterPoints(
    @Param('organizationId') id: string,
    @Body() dto: AllocateSemesterPointsDto,
  ) {
    return this.orgsService.allocateSemesterPoints(
      id,
      dto.targetOrganizationIds,
      dto.amount,
      dto.semesterName,
    );
  }
}
