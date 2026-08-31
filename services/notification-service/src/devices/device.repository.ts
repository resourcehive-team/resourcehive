import { Injectable } from "@nestjs/common";
import { PrismaService } from "@resourcehive/database";

@Injectable()
export class DeviceRepository {
  constructor(private readonly prisma: PrismaService) {}
  findByInstallationId(installationId: string) {
    return this.prisma.userDevice.findUnique({ where: { installationId } });
  }
  create(
    userId: string,
    input: {
      installationId: string;
      identifierType: string;
      platform: string;
      appVersion?: string;
    },
  ) {
    return this.prisma.userDevice.create({
      data: { userId, ...input, lastSeenAt: new Date() },
    });
  }
  update(
    id: string,
    input: { identifierType: string; platform: string; appVersion?: string },
  ) {
    return this.prisma.userDevice.update({
      where: { id },
      data: {
        ...input,
        status: "ACTIVE",
        invalidatedAt: null,
        lastRegisteredAt: new Date(),
        lastSeenAt: new Date(),
      },
    });
  }
  list(userId: string) {
    return this.prisma.userDevice.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }
  async remove(id: string, userId: string): Promise<boolean> {
    const result = await this.prisma.userDevice.updateMany({
      where: { id, userId },
      data: { status: "REVOKED", invalidatedAt: new Date() },
    });
    return result.count === 1;
  }
}
