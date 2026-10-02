import { ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "@resourcehive/database";
import { HealthService } from "./health.service";

describe("HealthService", () => {
  const queryRaw = jest.fn();
  const service = new HealthService({
    $queryRaw: queryRaw,
  } as unknown as PrismaService);

  beforeEach(() => queryRaw.mockReset());

  it("reports readiness when the database responds", async () => {
    queryRaw.mockResolvedValue([{ "?column?": 1 }]);

    await expect(service.checkReadiness()).resolves.toMatchObject({
      service: "booking-service",
      status: "ok",
      database: "connected",
    });
  });

  it("reports unavailability when the database cannot be reached", async () => {
    queryRaw.mockRejectedValue(new Error("connection failed"));

    await expect(service.checkReadiness()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it("reports liveness without touching the database", () => {
    expect(service.checkLiveness()).toMatchObject({
      service: "booking-service",
      status: "ok",
    });
    expect(queryRaw).not.toHaveBeenCalled();
  });
});
