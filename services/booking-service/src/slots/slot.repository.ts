import { Injectable } from "@nestjs/common";
import { Prisma, PrismaService } from "@resourcehive/database";
import { SlotResourceNotFoundError } from "./slot.errors";
import {
  CreateSlotInput,
  SlotListQuery,
  SlotLookup,
  SlotRecord,
} from "./slot.types";

const resourceSelection = {
  id: true,
  name: true,
  status: true,
  rootOrganizationId: true,
  ownerOrganizationId: true,
  pointCost: true,
} satisfies Prisma.ResourceSelect;

const slotWithResource = {
  resource: { select: resourceSelection },
  bookings: {
    where: { status: { not: "CANCELLED" } },
    select: { id: true },
  },
} satisfies Prisma.ResourceSlotInclude;

@Injectable()
export class SlotRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(
    { slotId, rootOrganizationId }: SlotLookup,
    client: Pick<Prisma.TransactionClient, "resourceSlot"> = this.prisma,
  ): Promise<SlotRecord | null> {
    return client.resourceSlot.findFirst({
      where: {
        id: slotId,
        resource: { rootOrganizationId },
      },
      include: slotWithResource,
    });
  }

  findByResource(query: SlotListQuery): Promise<SlotRecord[]> {
    const startsAt =
      query.startsAtOrAfter || query.startsBefore
        ? {
            ...(query.startsAtOrAfter ? { gte: query.startsAtOrAfter } : {}),
            ...(query.startsBefore ? { lt: query.startsBefore } : {}),
          }
        : undefined;

    return this.prisma.resourceSlot.findMany({
      where: {
        resourceId: query.resourceId,
        resource: { rootOrganizationId: query.rootOrganizationId },
        ...(startsAt ? { startsAt } : {}),
      },
      include: slotWithResource,
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      skip: query.skip ?? 0,
      take: query.take ?? 50,
    });
  }

  create(input: CreateSlotInput): Promise<SlotRecord> {
    return this.prisma.$transaction(async (transaction) => {
      const resource = await transaction.resource.findFirst({
        where: {
          id: input.resourceId,
          rootOrganizationId: input.rootOrganizationId,
          status: "ACTIVE",
        },
        select: { id: true },
      });

      if (!resource) {
        throw new SlotResourceNotFoundError();
      }

      return transaction.resourceSlot.create({
        data: {
          resourceId: resource.id,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
        },
        include: slotWithResource,
      });
    });
  }

  async canAccessResource(
    resourceId: string,
    userId: string,
    rootOrganizationId: string,
    client: Pick<
      Prisma.TransactionClient,
      "resource" | "organizationMembership" | "organization"
    > = this.prisma,
  ): Promise<boolean> {
    const resource = await client.resource.findFirst({
      where: { id: resourceId, rootOrganizationId, status: "ACTIVE" },
      select: {
        ownerOrganizationId: true,
        allowedOrganizations: { select: { organizationId: true } },
      },
    });
    if (!resource) return false;

    const allowedOrganizationIds = [
      resource.ownerOrganizationId,
      ...resource.allowedOrganizations.map((item) => item.organizationId),
    ];
    const membership = await client.organizationMembership.findFirst({
      where: {
        userId,
        status: "APPROVED",
        organizationId: { in: allowedOrganizationIds },
        organization: { rootOrganizationId },
      },
      select: { id: true },
    });
    return Boolean(membership);
  }

  async canManageResource(
    resourceId: string,
    userId: string,
    rootOrganizationId: string,
  ): Promise<boolean> {
    const resource = await this.prisma.resource.findFirst({
      where: { id: resourceId, rootOrganizationId, status: "ACTIVE" },
      select: {
        ownerOrganization: {
          select: { id: true, parentId: true, rootOrganizationId: true },
        },
      },
    });
    if (!resource) return false;

    const administratorMemberships =
      await this.prisma.organizationMembership.findMany({
        where: {
          userId,
          status: "APPROVED",
          role: "ADMIN",
          organization: { rootOrganizationId },
        },
        select: { organizationId: true },
      });
    const administratorIds = new Set(
      administratorMemberships.map((item) => item.organizationId),
    );

    let organization: { id: string; parentId: string | null } | null =
      resource.ownerOrganization;
    while (organization) {
      if (administratorIds.has(organization.id)) return true;
      if (!organization.parentId) break;
      organization = await this.prisma.organization.findFirst({
        where: {
          id: organization.parentId,
          rootOrganizationId,
        },
        select: { id: true, parentId: true },
      });
    }
    return false;
  }
}
