import { Controller, Get, Post, Body } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantType } from '@resourcehive/database';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  async createTenant(@Body() body: { name: string; type: TenantType; domain: string }) {
    return this.tenantsService.createTenant(body.name, body.type, body.domain);
  }

  @Get()
  async getAllTenants() {
    return this.tenantsService.getAllTenants();
  }
}
