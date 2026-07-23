import { Injectable } from '@nestjs/common';
import { PrismaService } from '@resourcehive/database';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.person.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' } },
      include: {
        tenant_membership: {
          include: {
            tenant_tenant_membership_tenant_idTotenant: true,
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.person.findMany({
      include: {
        tenant_membership: {
          include: {
            tenant_tenant_membership_tenant_idTotenant: true,
          },
        },
      },
    });
  }
}
