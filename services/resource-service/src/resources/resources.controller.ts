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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
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
  @ApiCreatedResponse({
    description: 'The resource has been created successfully.',
  })
  @ApiBadRequestResponse({ description: 'Invalid request data.' })
  @ApiForbiddenResponse({
    description: 'Forbidden. Requires Admin privileges.',
  })
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
  @ApiOkResponse({ description: 'The resource has been updated successfully.' })
  @ApiNotFoundResponse({ description: 'Resource not found.' })
  @ApiForbiddenResponse({
    description: 'Forbidden. Requires Admin privileges.',
  })
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
  @ApiOkResponse({
    description: 'The resource has been archived/deleted successfully.',
  })
  @ApiNotFoundResponse({ description: 'Resource not found.' })
  @ApiForbiddenResponse({
    description: 'Forbidden. Requires Admin privileges.',
  })
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
  @ApiOkResponse({
    description: 'The resources have been listed successfully.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. You do not have access to this organization.',
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
  @ApiOkResponse({
    description: 'The resource has been retrieved successfully.',
  })
  @ApiNotFoundResponse({ description: 'Resource not found.' })
  @ApiForbiddenResponse({
    description: 'Forbidden. User is not part of the organization.',
  })
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
  @ApiOkResponse({
    description:
      'Returns bookable true if access is allowed and resource is active.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. Resource is inactive or user lacks access.',
  })
  @ApiNotFoundResponse({ description: 'Resource not found.' })
  checkAccess(
    @Param('organizationId') organizationId: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.resourcesService.checkBookingAccess(organizationId, resourceId);
  }
}
