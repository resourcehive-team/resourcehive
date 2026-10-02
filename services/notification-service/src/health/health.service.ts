import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "@resourcehive/database";
import { NotificationConfigurationService } from "../config/notification-configuration.service";

export interface HealthResponse {
  service: "notification-service";
  status: "ok";
  database: "connected";
  providers: {
    kafka: "enabled" | "disabled";
    email: "resend" | "console";
    push: "fcm" | "console";
  };
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configuration: NotificationConfigurationService,
  ) {}

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
      providers: this.configuration.modes(),
      timestamp: new Date().toISOString(),
    };
  }
}
