import { Injectable } from '@nestjs/common';
import { PrismaService } from '@resourcehive/database';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createUser(
    tenantId: string,
    fullName: string,
    email: string,
    passwordHash: string,
  ) {
    return this.prisma.user.create({
      data: {
        tenant_id: tenantId,
        full_name: fullName,
        email,
        password_hash: passwordHash,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findAll() {
    return this.prisma.user.findMany();
  }
}
