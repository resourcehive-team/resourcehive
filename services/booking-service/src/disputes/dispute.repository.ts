import { Injectable } from "@nestjs/common";
import { Prisma, PrismaService } from "@resourcehive/database";
import { DisputeResourceActionInvalidError } from "./dispute.errors";
import {
  CreateDisputeInput,
  DisputeRecord,
  DisputeTransactionClient,
  DisputeWithBookingContext,
  DisputeWithSubmitter,
  ResourceAction,
  TransitionDisputeInput,
} from "./dispute.types";

const withBookingContext = {
  booking: {
    select: {
      userId: true,
      status: true,
      resourceSlot: {
        select: {
          resource: {
            select: {
              id: true,
              ownerOrganizationId: true,
              unavailableDisputeId: true,
            },
          },
        },
      },
    },
  },
} as const;

@Injectable()
export class DisputeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: CreateDisputeInput,
    client: DisputeTransactionClient,
  ): Promise<DisputeRecord> {
    const booking = await client.booking.findUnique({
      where: { id: input.bookingId },
      select: { resourceSlot: { select: { resource: true } } },
    });
    return client.bookingDispute.create({
      data: {
        bookingId: input.bookingId,
        rootOrganizationId: booking!.resourceSlot.resource.rootOrganizationId,
        resolverOrganizationId: input.resolverOrganizationId,
        submittedByUserId: input.submittedByUserId,
        reason: input.reason,
        description: input.description,
        evidence: input.evidence ?? Prisma.JsonNull,
      },
    });
  }

  findById(
    id: string,
    client: Pick<Prisma.TransactionClient, "bookingDispute"> = this.prisma,
  ): Promise<DisputeWithBookingContext | null> {
    return client.bookingDispute.findUnique({
      where: { id },
      include: withBookingContext,
    });
  }

  findMine(submittedByUserId: string): Promise<DisputeRecord[]> {
    return this.prisma.bookingDispute.findMany({
      where: { submittedByUserId },
      orderBy: { createdAt: "desc" },
    });
  }

  findForResolverOrganizations(
    resolverOrganizationIds: string[],
  ): Promise<DisputeWithSubmitter[]> {
    return this.prisma.bookingDispute.findMany({
      where: { resolverOrganizationId: { in: resolverOrganizationIds } },
      include: {
        submittedByUser: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async addEvent(
    disputeId: string,
    actorUserId: string,
    fromStatus: string | null,
    toStatus: string,
    notes: string | undefined,
    client: DisputeTransactionClient,
  ): Promise<void> {
    await client.bookingDisputeEvent.create({
      data: { disputeId, actorUserId, fromStatus, toStatus, notes },
    });
  }

  async applyTransition(
    disputeId: string,
    resourceId: string,
    reviewerUserId: string,
    input: TransitionDisputeInput,
    isTerminal: boolean,
    client: DisputeTransactionClient,
  ): Promise<DisputeRecord> {
    const dispute = await client.bookingDispute.update({
      where: { id: disputeId },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.resolutionNotes !== undefined
          ? { resolutionNotes: input.resolutionNotes }
          : {}),
        reviewedByUserId: reviewerUserId,
        ...(isTerminal ? { resolvedAt: new Date() } : {}),
      },
    });

    await this.applyResourceAction(
      resourceId,
      disputeId,
      input.resourceAction ?? "NONE",
      client,
    );
    return dispute;
  }

  private async applyResourceAction(
    resourceId: string,
    disputeId: string,
    action: ResourceAction,
    client: DisputeTransactionClient,
  ): Promise<void> {
    if (action === "MARK_UNAVAILABLE") {
      await client.resource.update({
        where: { id: resourceId },
        data: { status: "INACTIVE", unavailableDisputeId: disputeId },
      });
    } else if (action === "RESTORE") {
      const result = await client.resource.updateMany({
        where: { id: resourceId, unavailableDisputeId: disputeId },
        data: { status: "ACTIVE", unavailableDisputeId: null },
      });
      if (result.count !== 1) throw new DisputeResourceActionInvalidError();
    }
  }
}
