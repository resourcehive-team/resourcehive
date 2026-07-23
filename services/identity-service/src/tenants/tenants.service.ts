import { Injectable } from '@nestjs/common';
import { PrismaService } from '@resourcehive/database';
import { TenantType } from '@resourcehive/database';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async createTenant(name: string, tenantType: TenantType, domain: string) {
    return this.prisma.tenant.create({
      data: {
        name,
        tenant_type: tenantType,
        institutional_email_domain: domain,
      },
    });
  }

  async getAllTenants() {
    return this.prisma.tenant.findMany();
  }
}
