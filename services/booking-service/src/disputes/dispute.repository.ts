import { Injectable } from "@nestjs/common";
import { Prisma, PrismaService } from "@resourcehive/database";
import {
  DisputeConcurrentUpdateError,
  DisputeResourceActionInvalidError,
} from "./dispute.errors";
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
  submittedByUser: {
    select: { firstName: true, lastName: true, email: true },
  },
  booking: {
    select: {
      id: true,
      userId: true,
      status: true,
      resourceSlot: {
        select: {
          startsAt: true,
          endsAt: true,
          resource: {
            select: {
              id: true,
              name: true,
              ownerOrganizationId: true,
              ownerOrganization: { select: { id: true, name: true } },
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
    return client.bookingDispute.create({
      data: {
        bookingId: input.bookingId,
        rootOrganizationId: input.rootOrganizationId,
        resolverOrganizationId: input.resolverOrganizationId,
        submittedByUserId: input.submittedByUserId,
        reason: input.reason,
        description: input.description,
        evidence: input.evidence ?? Prisma.JsonNull,
      },
      include: withBookingContext,
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
      include: withBookingContext,
      orderBy: { createdAt: "desc" },
    });
  }

  findForOwnerOrganizations(
    ownerOrganizationIds: string[],
  ): Promise<DisputeWithSubmitter[]> {
    return this.prisma.bookingDispute.findMany({
      where: {
        booking: {
          resourceSlot: {
            resource: { ownerOrganizationId: { in: ownerOrganizationIds } },
          },
        },
      },
      include: withBookingContext,
      orderBy: { createdAt: "desc" },
    });
  }

  async addEvent(
    disputeId: string,
    actorUserId: string,
    fromStatus: string | null,
    toStatus: string,
    notes: string | undefined,
    rootOrganizationId: string,
    client: DisputeTransactionClient,
  ): Promise<void> {
    await client.bookingDisputeEvent.create({
      data: {
        disputeId,
        rootOrganizationId,
        actorUserId,
        fromStatus,
        toStatus,
        notes,
      },
    });
  }

  async applyTransition(
    disputeId: string,
    expectedStatus: string,
    resourceId: string,
    reviewerUserId: string,
    input: TransitionDisputeInput,
    isTerminal: boolean,
    client: DisputeTransactionClient,
  ): Promise<DisputeRecord> {
    const result = await client.bookingDispute.updateMany({
      where: { id: disputeId, status: expectedStatus },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.resolutionNotes !== undefined
          ? { resolutionNotes: input.resolutionNotes }
          : {}),
        reviewedByUserId: reviewerUserId,
        ...(isTerminal && input.status ? { resolvedAt: new Date() } : {}),
      },
    });
    if (result.count !== 1) throw new DisputeConcurrentUpdateError();

    await this.applyResourceAction(
      resourceId,
      disputeId,
      input.resourceAction ?? "NONE",
      client,
    );
    return client.bookingDispute.findUniqueOrThrow({
      where: { id: disputeId },
      include: withBookingContext,
    });
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
