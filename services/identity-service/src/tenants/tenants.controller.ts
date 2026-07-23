import { Controller, Get, Post, Body } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { tenant_type_enum } from '@resourcehive/database';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  async createTenant(
    @Body() body: { name: string; type: tenant_type_enum; domain: string },
  ) {
    return this.tenantsService.createTenant(body.name, body.type, body.domain);
  }

  @Get()
  async getAllTenants() {
    return this.tenantsService.getAllTenants();
  }
}
