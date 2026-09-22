import { ForbiddenException, Injectable } from "@nestjs/common";
import { Prisma, PrismaService } from "@resourcehive/database";
import { AuthenticatedUser } from "@resourcehive/service-auth";
import { BookingAuthorizationService } from "../authorization/booking-authorization.service";
import { DateRangeDto } from "./analytics.dto";

const ACTIVE_STATUSES = Prisma.sql`('CONFIRMED', 'COMPLETED')`;
const DEFAULT_RANGE_DAYS = 90;

export interface ResourceDemand {
  resourceId: string;
  name: string;
  bookingCount: number;
}

export interface OrganizationUsage {
  organizationId: string;
  organizationName: string;
  bookingCount: number;
}

export interface PeakSlot {
  dayOfWeek: number;
  hour: number;
  bookingCount: number;
}

export interface PersonalResourceUsage extends ResourceDemand {
  totalHours: number;
}

export interface PlatformCompanyOverview {
  organizationId: string;
  organizationName: string;
  newSignups: number;
  totalItemsListed: number;
  totalBorrows: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: BookingAuthorizationService,
  ) {}

  async inventoryDemand(
    user: AuthenticatedUser,
    range: DateRangeDto,
  ): Promise<ResourceDemand[]> {
    const orgIds = await this.administeredOrganizationIds(user);
    const { from, to } = this.resolveRange(range);
    return this.prisma.$queryRaw<ResourceDemand[]>`
      SELECT r.id AS "resourceId", r.name, COUNT(b.id)::int AS "bookingCount"
      FROM resources r
      LEFT JOIN resource_slots rs ON rs.resource_id = r.id
      LEFT JOIN bookings b ON b.resource_slot_id = rs.id
        AND b.status IN ${ACTIVE_STATUSES}
        AND b.created_at BETWEEN ${from} AND ${to}
      WHERE r.owner_organization_id IN (${Prisma.join(orgIds)})
      GROUP BY r.id, r.name
      ORDER BY "bookingCount" DESC
    `;
  }

  async userSegmentation(
    user: AuthenticatedUser,
    range: DateRangeDto,
  ): Promise<OrganizationUsage[]> {
    const orgIds = await this.administeredOrganizationIds(user);
    const { from, to } = this.resolveRange(range);
    return this.prisma.$queryRaw<OrganizationUsage[]>`
      SELECT om.organization_id AS "organizationId", o.name AS "organizationName",
        COUNT(DISTINCT b.id)::int AS "bookingCount"
      FROM bookings b
      JOIN resource_slots rs ON rs.id = b.resource_slot_id
      JOIN resources r ON r.id = rs.resource_id
      JOIN organization_memberships om ON om.user_id = b.user_id
      JOIN organizations o ON o.id = om.organization_id
      WHERE r.owner_organization_id IN (${Prisma.join(orgIds)})
        AND b.status IN ${ACTIVE_STATUSES}
        AND b.created_at BETWEEN ${from} AND ${to}
      GROUP BY om.organization_id, o.name
      ORDER BY "bookingCount" DESC
    `;
  }

  async peakTimesForOrg(
    user: AuthenticatedUser,
    range: DateRangeDto,
  ): Promise<PeakSlot[]> {
    const orgIds = await this.administeredOrganizationIds(user);
    const { from, to } = this.resolveRange(range);
    return this.prisma.$queryRaw<PeakSlot[]>`
      SELECT EXTRACT(DOW FROM rs.starts_at)::int AS "dayOfWeek",
        EXTRACT(HOUR FROM rs.starts_at)::int AS "hour",
        COUNT(b.id)::int AS "bookingCount"
      FROM bookings b
      JOIN resource_slots rs ON rs.id = b.resource_slot_id
      JOIN resources r ON r.id = rs.resource_id
      WHERE r.owner_organization_id IN (${Prisma.join(orgIds)})
        AND b.status IN ${ACTIVE_STATUSES}
        AND b.created_at BETWEEN ${from} AND ${to}
      GROUP BY 1, 2
      ORDER BY "bookingCount" DESC
    `;
  }

  async myUsage(
    user: AuthenticatedUser,
    range: DateRangeDto,
  ): Promise<PersonalResourceUsage[]> {
    const { from, to } = this.resolveRange(range);
    return this.prisma.$queryRaw<PersonalResourceUsage[]>`
      SELECT r.id AS "resourceId", r.name, COUNT(b.id)::int AS "bookingCount",
        COALESCE(SUM(EXTRACT(EPOCH FROM (rs.ends_at - rs.starts_at)) / 3600), 0)::float AS "totalHours"
      FROM bookings b
      JOIN resource_slots rs ON rs.id = b.resource_slot_id
      JOIN resources r ON r.id = rs.resource_id
      WHERE b.user_id = ${user.userId}
        AND b.status IN ${ACTIVE_STATUSES}
        AND b.created_at BETWEEN ${from} AND ${to}
      GROUP BY r.id, r.name
      ORDER BY "bookingCount" DESC
    `;
  }

  async peakTimesForTenant(
    user: AuthenticatedUser,
    range: DateRangeDto,
  ): Promise<PeakSlot[]> {
    const context = await this.authorization.resolve(user);
    const { from, to } = this.resolveRange(range);
    return this.prisma.$queryRaw<PeakSlot[]>`
      SELECT EXTRACT(DOW FROM rs.starts_at)::int AS "dayOfWeek",
        EXTRACT(HOUR FROM rs.starts_at)::int AS "hour",
        COUNT(b.id)::int AS "bookingCount"
      FROM bookings b
      JOIN resource_slots rs ON rs.id = b.resource_slot_id
      JOIN resources r ON r.id = rs.resource_id
      WHERE r.root_organization_id = ${context.rootOrganizationId}::uuid
        AND b.status IN ${ACTIVE_STATUSES}
        AND b.created_at BETWEEN ${from} AND ${to}
      GROUP BY 1, 2
      ORDER BY "bookingCount" DESC
    `;
  }

  async platformOverview(
    user: AuthenticatedUser,
    range: DateRangeDto,
  ): Promise<PlatformCompanyOverview[]> {
    await this.assertPlatformAdmin(user);
    const { from, to } = this.resolveRange(range);
    return this.prisma.$queryRaw<PlatformCompanyOverview[]>`
      WITH companies AS (
        SELECT id, name FROM organizations WHERE parent_id IS NULL
      ),
      signups AS (
        SELECT o.root_organization_id AS company_id,
          COUNT(DISTINCT om.user_id)::int AS count
        FROM organization_memberships om
        JOIN organizations o ON o.id = om.organization_id
        WHERE om.joined_at BETWEEN ${from} AND ${to}
        GROUP BY o.root_organization_id
      ),
      items AS (
        SELECT root_organization_id AS company_id, COUNT(*)::int AS count
        FROM resources
        GROUP BY root_organization_id
      ),
      borrows AS (
        SELECT r.root_organization_id AS company_id, COUNT(b.id)::int AS count
        FROM bookings b
        JOIN resource_slots rs ON rs.id = b.resource_slot_id
        JOIN resources r ON r.id = rs.resource_id
        WHERE b.status IN ${ACTIVE_STATUSES}
          AND b.created_at BETWEEN ${from} AND ${to}
        GROUP BY r.root_organization_id
      )
      SELECT c.id AS "organizationId", c.name AS "organizationName",
        COALESCE(s.count, 0) AS "newSignups",
        COALESCE(i.count, 0) AS "totalItemsListed",
        COALESCE(b.count, 0) AS "totalBorrows"
      FROM companies c
      LEFT JOIN signups s ON s.company_id = c.id
      LEFT JOIN items i ON i.company_id = c.id
      LEFT JOIN borrows b ON b.company_id = c.id
      ORDER BY c.name
    `;
  }

  private async assertPlatformAdmin(user: AuthenticatedUser): Promise<void> {
    const record = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { platformRole: true },
    });
    if (record?.platformRole !== "PLATFORM_ADMIN") {
      throw new ForbiddenException("Platform administrator access is required");
    }
  }

  private async administeredOrganizationIds(
    user: AuthenticatedUser,
  ): Promise<string[]> {
    const memberships = await this.prisma.organizationMembership.findMany({
      where: { userId: user.userId, role: "ADMIN", status: "APPROVED" },
      select: { organizationId: true },
    });
    if (memberships.length === 0) {
      throw new ForbiddenException("Administrator access is required");
    }
    return memberships.map((m) => m.organizationId);
  }

  private resolveRange(range: DateRangeDto): { from: Date; to: Date } {
    const to = range.to ? new Date(range.to) : new Date();
    const from = range.from
      ? new Date(range.from)
      : new Date(to.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);
    return { from, to };
  }
}
