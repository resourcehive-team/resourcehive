import { ForbiddenException } from "@nestjs/common";
import { PrismaService } from "@resourcehive/database";
import { BookingAuthorizationService } from "../authorization/booking-authorization.service";
import { AnalyticsService } from "./analytics.service";

describe("AnalyticsService", () => {
  const organizationMembership = { findMany: jest.fn() };
  const findUniqueUser = jest.fn();
  const queryRaw = jest.fn().mockResolvedValue([]);
  const prisma = {
    organizationMembership,
    user: { findUnique: findUniqueUser },
    $queryRaw: queryRaw,
  } as unknown as PrismaService;
  const authorization = {
    resolve: jest.fn().mockResolvedValue({
      userId: "user-id",
      organizationId: "org-id",
      rootOrganizationId: "root-id",
      role: "MEMBER",
    }),
  } as unknown as BookingAuthorizationService;
  const service = new AnalyticsService(prisma, authorization);
  const user = {
    userId: "user-id",
    email: "user@example.edu",
    organizationId: "org-id",
    role: "member",
  };

  beforeEach(() => jest.clearAllMocks());

  it("rejects org analytics for a non-administrator", async () => {
    organizationMembership.findMany.mockResolvedValue([]);

    await expect(service.inventoryDemand(user, {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("queries inventory demand scoped to the administrator's organizations", async () => {
    organizationMembership.findMany.mockResolvedValue([
      { organizationId: "org-1" },
      { organizationId: "org-2" },
    ]);

    await service.inventoryDemand(user, {
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-02-01T00:00:00.000Z",
    });

    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it("queries personal usage without requiring administrator access", async () => {
    await service.myUsage(user, {});

    expect(organizationMembership.findMany).not.toHaveBeenCalled();
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it("rejects platform analytics for a non platform administrator", async () => {
    findUniqueUser.mockResolvedValue({ platformRole: "USER" });

    await expect(service.platformOverview(user, {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("queries platform overview for a platform administrator", async () => {
    findUniqueUser.mockResolvedValue({ platformRole: "PLATFORM_ADMIN" });

    await service.platformOverview(user, {});

    expect(queryRaw).toHaveBeenCalledTimes(1);
  });
});
