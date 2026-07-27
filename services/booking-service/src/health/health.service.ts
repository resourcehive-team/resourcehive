import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "@resourcehive/database";

export interface HealthResponse {
  service: "booking-service";
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
        service: "booking-service",
        status: "unavailable",
        database: "disconnected",
        timestamp: new Date().toISOString(),
      });
    }

    return {
      service: "booking-service",
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    };
  }
}
