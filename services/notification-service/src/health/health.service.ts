import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "@resourcehive/database";

export interface HealthResponse {
  service: "notification-service";
  status: "ok";
  database: "connected";
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        service: "notification-service",
        status: "unavailable",
        database: "disconnected",
        timestamp: new Date().toISOString(),
      });
    }

    return {
      service: "notification-service",
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    };
  }
}
