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
} satisfies Prisma.ResourceSlotInclude;

@Injectable()
export class SlotRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById({
    slotId,
    rootOrganizationId,
  }: SlotLookup): Promise<SlotRecord | null> {
    return this.prisma.resourceSlot.findFirst({
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
}
