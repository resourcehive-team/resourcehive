import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
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
}
