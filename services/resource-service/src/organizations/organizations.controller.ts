import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '@resourcehive/service-auth';
import type { AuthenticatedUser } from '@resourcehive/service-auth';
import { TenantGuard } from '../auth/tenant.guard';
import { AdminGuard } from '../auth/admin.guard';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Get('roots')
  @ApiOperation({ summary: 'Get all root organizations (Tenants)' })
  @ApiOkResponse({ description: 'Returns a list of root organizations.' })
  getRoots() {
    return this.orgsService.findAllRoots();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization details' })
  @ApiOkResponse({ description: 'Returns the organization details.' })
  @ApiNotFoundResponse({ description: 'Organization not found.' })
  getOne(@Param('id') id: string) {
    return this.orgsService.findOne(id);
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Get child organizations for a root tenant' })
  @ApiOkResponse({ description: 'Returns a list of child organizations.' })
  @ApiNotFoundResponse({ description: 'Parent organization not found.' })
  getChildren(@Param('id') id: string) {
    return this.orgsService.findChildren(id);
  }

  @UseGuards(TenantGuard, AdminGuard)
  @Get(':organizationId/email-domains')
  @ApiOperation({ summary: 'Get email domains for an organization' })
  @ApiOkResponse({
    description: 'Returns a list of email domains for the organization.',
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
  @ApiCreatedResponse({ description: 'Email domain added successfully.' })
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
  @ApiOkResponse({ description: 'Email domain removed successfully.' })
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
  @ApiOkResponse({ description: 'Returns the allowlist for the organization.' })
  @ApiForbiddenResponse({
    description: 'Forbidden. Requires Admin privileges.',
  })
  getAllowlist(@Param('organizationId') orgId: string) {
    return this.orgsService.getAllowlist(orgId);
  }
  @UseGuards(TenantGuard, AdminGuard)
  @Post(':organizationId/allowlist')
  @ApiOperation({ summary: 'Add email to allowlist' })
  @ApiCreatedResponse({ description: 'Email added to allowlist successfully.' })
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
  @ApiOkResponse({ description: 'Email removed from allowlist successfully.' })
  @ApiForbiddenResponse({
    description: 'Forbidden. Requires Admin privileges.',
  })
  removeFromAllowlist(
    @Param('organizationId') orgId: string,
    @Param('allowlistId') allowlistId: string,
  ) {
    return this.orgsService.removeFromAllowlist(orgId, allowlistId);
  }
}
