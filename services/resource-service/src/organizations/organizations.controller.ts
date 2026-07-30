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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
  getRoots() {
    return this.orgsService.findAllRoots();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization details' })
  getOne(@Param('id') id: string) {
    return this.orgsService.findOne(id);
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Get child organizations for a root tenant' })
  getChildren(@Param('id') id: string) {
    return this.orgsService.findChildren(id);
  }

  @UseGuards(TenantGuard, AdminGuard)
  @Get(':organizationId/email-domains')
  @ApiOperation({ summary: 'Get email domains for an organization' })
  getEmailDomains(@Param('organizationId') orgId: string) {
    return this.orgsService.getEmailDomains(orgId);
  }
  @UseGuards(TenantGuard, AdminGuard)
  @Post(':organizationId/email-domains')
  @ApiOperation({ summary: 'Add an email domain' })
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
  removeEmailDomain(
    @Param('organizationId') orgId: string,
    @Param('domainId') domainId: string,
  ) {
    return this.orgsService.removeEmailDomain(orgId, domainId);
  }
  @UseGuards(TenantGuard, AdminGuard)
  @Get(':organizationId/allowlist')
  @ApiOperation({ summary: 'Get allowlist for an organization' })
  getAllowlist(@Param('organizationId') orgId: string) {
    return this.orgsService.getAllowlist(orgId);
  }
  @UseGuards(TenantGuard, AdminGuard)
  @Post(':organizationId/allowlist')
  @ApiOperation({ summary: 'Add email to allowlist' })
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
  removeFromAllowlist(
    @Param('organizationId') orgId: string,
    @Param('allowlistId') allowlistId: string,
  ) {
    return this.orgsService.removeFromAllowlist(orgId, allowlistId);
  }
}
