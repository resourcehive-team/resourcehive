import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ResourcesService } from './resources.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '@resourcehive/service-auth';
import type { AuthenticatedUser } from '@resourcehive/service-auth';
import { TenantGuard } from '../auth/tenant.guard';
import { AdminGuard } from '../auth/admin.guard';

@ApiTags('Resources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @UseGuards(TenantGuard, AdminGuard)
  @Post('organization/:organizationId')
  @ApiOperation({ summary: 'Create a new resource' })
  create(
    @Param('organizationId') organizationId: string,
    @Body() createResourceDto: CreateResourceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.resourcesService.create(
      organizationId,
      user.userId,
      createResourceDto,
    );
  }

  @UseGuards(TenantGuard, AdminGuard)
  @Patch('organization/:organizationId/:resourceId')
  @ApiOperation({ summary: 'Update a resource' })
  update(
    @Param('organizationId') organizationId: string,
    @Param('resourceId') resourceId: string,
    @Body() updateResourceDto: UpdateResourceDto,
  ) {
    return this.resourcesService.update(
      organizationId,
      resourceId,
      updateResourceDto,
    );
  }

  @UseGuards(TenantGuard, AdminGuard)
  @Delete('organization/:organizationId/:resourceId')
  @ApiOperation({ summary: 'Archive/Delete a resource' })
  remove(
    @Param('organizationId') organizationId: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.resourcesService.remove(organizationId, resourceId);
  }

  @UseGuards(TenantGuard)
  @Get('organization/:organizationId')
  @ApiOperation({
    summary: 'List all resources available to this organization',
  })
  findAll(
    @Param('organizationId') organizationId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.resourcesService.findAll(organizationId, page, limit, search);
  }

  @UseGuards(TenantGuard)
  @Get('organization/:organizationId/:resourceId')
  @ApiOperation({ summary: 'Get details of a specific resource' })
  findOne(
    @Param('organizationId') organizationId: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.resourcesService.findOne(organizationId, resourceId);
  }

  @UseGuards(TenantGuard)
  @Get('organization/:organizationId/:resourceId/access-check')
  @ApiOperation({
    summary: 'Internal check for Booking Service to verify resource access',
  })
  checkAccess(
    @Param('organizationId') organizationId: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.resourcesService.checkBookingAccess(organizationId, resourceId);
  }
}
