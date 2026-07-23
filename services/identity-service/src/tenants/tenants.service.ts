import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@resourcehive/database';
import { tenant_type_enum } from '@resourcehive/database';
import { randomUUID } from 'crypto';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async createTenant(
    name: string,
    tenantType: tenant_type_enum,
    domain: string,
  ) {
    if (tenantType !== tenant_type_enum.organization) {
      throw new BadRequestException(
        'A non-organization tenant requires its parent hierarchy IDs',
      );
    }

    const tenantId = randomUUID();
    return this.prisma.tenant.create({
      data: {
        tenant_id: tenantId,
        name,
        tenant_type: tenantType,
        organization_tenant_id: tenantId,
        organization_domain: {
          create: {
            domain: domain.trim().toLowerCase(),
          },
        },
      },
      include: { organization_domain: true },
    });
  }

  async getAllTenants() {
    return this.prisma.tenant.findMany({
      include: { organization_domain: true },
    });
  }

  async findById(tenantId: string) {
    return this.prisma.tenant.findUnique({
      where: { tenant_id: tenantId },
      include: {
        tenant_tenant_organization_tenant_idTotenant: {
          include: { organization_domain: true },
        },
      },
    });
  }
}
