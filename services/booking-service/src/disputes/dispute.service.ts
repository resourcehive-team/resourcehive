import { HttpException, Injectable } from "@nestjs/common";
import { Prisma, PrismaService } from "@resourcehive/database";
import { AuthenticatedUser } from "@resourcehive/service-auth";
import { CreateDisputeDto, UpdateDisputeDto } from "./dispute.dto";
import { DisputeRepository } from "./dispute.repository";
import {
  DisputeAdministratorRequiredError,
  DisputeAlreadyExistsError,
  DisputeBookingNotEligibleError,
  DisputeBookingNotFoundError,
  DisputeForbiddenError,
  DisputeInvalidTransitionError,
  DisputeNoOrganizationError,
  DisputeNotFoundError,
  DisputeOperationError,
  DisputeResolutionNotesRequiredError,
} from "./dispute.errors";
import {
  DisputeRecord,
  DisputeStatus,
  DisputeWithSubmitter,
} from "./dispute.types";

const TERMINAL_STATUSES: DisputeStatus[] = ["RESOLVED", "REJECTED"];
const ALLOWED_TRANSITIONS: Record<DisputeStatus, DisputeStatus[]> = {
  OPEN: ["UNDER_REVIEW", "RESOLVED", "REJECTED"],
  UNDER_REVIEW: ["RESOLVED", "REJECTED"],
  RESOLVED: [],
  REJECTED: [],
};

@Injectable()
export class DisputeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly disputes: DisputeRepository,
  ) {}

  async open(
    dto: CreateDisputeDto,
    user: AuthenticatedUser,
  ): Promise<DisputeRecord> {
    try {
      if (!user.rootOrganizationId) throw new DisputeNoOrganizationError();
      const rootOrganizationId = user.rootOrganizationId;

      return await this.prisma.$transaction(async (transaction) => {
        const membership = await transaction.organizationMembership.findFirst({
          where: {
            userId: user.userId,
            status: "APPROVED",
            user: { status: "ACTIVE" },
            organization: { rootOrganizationId, status: "ACTIVE" },
          },
          select: { id: true },
        });
        if (!membership) throw new DisputeNoOrganizationError();
        const booking = await transaction.booking.findFirst({
          where: { id: dto.bookingId, userId: user.userId, rootOrganizationId },
          select: {
            id: true,
            status: true,
            resourceSlot: {
              select: { resource: { select: { ownerOrganizationId: true } } },
            },
          },
        });
        if (!booking) throw new DisputeBookingNotFoundError();
        if (booking.status !== "COMPLETED") {
          throw new DisputeBookingNotEligibleError();
        }

        const existing = await transaction.bookingDispute.findUnique({
          where: { bookingId: dto.bookingId },
          select: { id: true },
        });
        if (existing) throw new DisputeAlreadyExistsError();

        const dispute = await this.disputes.create(
          {
            bookingId: dto.bookingId,
            rootOrganizationId,
            resolverOrganizationId:
              booking.resourceSlot.resource.ownerOrganizationId,
            submittedByUserId: user.userId,
            reason: dto.reason,
            description: dto.description.trim(),
            evidence: dto.evidence,
          },
          transaction,
        );
        await this.disputes.addEvent(
          dispute.id,
          user.userId,
          null,
          dispute.status,
          "Dispute opened",
          dispute.rootOrganizationId,
          transaction,
        );
        return dispute;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new DisputeAlreadyExistsError();
      }
      this.handleError(error, "open");
    }
  }

  async listMine(user: AuthenticatedUser): Promise<DisputeRecord[]> {
    try {
      return await this.disputes.findMine(user.userId);
    } catch (error) {
      this.handleError(error, "retrieve");
    }
  }

  async listForOrg(user: AuthenticatedUser): Promise<DisputeWithSubmitter[]> {
    try {
      const organizationIds = await this.administeredOrganizationIds(user);
      if (organizationIds.length === 0) {
        throw new DisputeAdministratorRequiredError();
      }
      return await this.disputes.findForOwnerOrganizations(organizationIds);
    } catch (error) {
      this.handleError(error, "retrieve");
    }
  }

  async getById(id: string, user: AuthenticatedUser): Promise<DisputeRecord> {
    try {
      const dispute = await this.disputes.findById(id);
      if (!dispute) throw new DisputeNotFoundError();
      await this.assertCanManage(
        dispute.booking.resourceSlot.resource.ownerOrganizationId,
        user,
      );
      return dispute;
    } catch (error) {
      this.handleError(error, "retrieve");
    }
  }

  async transition(
    id: string,
    dto: UpdateDisputeDto,
    user: AuthenticatedUser,
  ): Promise<DisputeRecord> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const dispute = await this.disputes.findById(id, transaction);
        if (!dispute) throw new DisputeNotFoundError();
        await this.assertCanManage(
          dispute.booking.resourceSlot.resource.ownerOrganizationId,
          user,
          transaction,
        );

        const nextStatus = dto.status ?? (dispute.status as DisputeStatus);
        if (dto.status) {
          const allowed = ALLOWED_TRANSITIONS[dispute.status as DisputeStatus];
          if (!allowed?.includes(dto.status))
            throw new DisputeInvalidTransitionError();
        }
        const isTerminal = TERMINAL_STATUSES.includes(nextStatus);
        const resolutionNotes = dto.resolutionNotes?.trim();
        if (
          isTerminal &&
          !(resolutionNotes ?? dispute.resolutionNotes)?.trim()
        ) {
          throw new DisputeResolutionNotesRequiredError();
        }
        const input = {
          ...dto,
          ...(resolutionNotes !== undefined ? { resolutionNotes } : {}),
        };
        const updated = await this.disputes.applyTransition(
          id,
          dispute.status,
          dispute.booking.resourceSlot.resource.id,
          user.userId,
          input,
          isTerminal,
          transaction,
        );
        if (dto.status && dto.status !== dispute.status) {
          await this.disputes.addEvent(
            id,
            user.userId,
            dispute.status,
            dto.status,
            resolutionNotes,
            dispute.rootOrganizationId,
            transaction,
          );
        }
        return updated;
      });
    } catch (error) {
      this.handleError(error, "update");
    }
  }

  private async administeredOrganizationIds(
    user: AuthenticatedUser,
  ): Promise<string[]> {
    if (!user.rootOrganizationId) return [];
    const memberships = await this.prisma.organizationMembership.findMany({
      where: {
        userId: user.userId,
        role: "ADMIN",
        status: "APPROVED",
        user: { status: "ACTIVE" },
        organization: {
          rootOrganizationId: user.rootOrganizationId,
          status: "ACTIVE",
        },
      },
      select: { organizationId: true },
    });
    return memberships.map((m) => m.organizationId);
  }

  private async assertCanManage(
    resolverOrganizationId: string,
    user: AuthenticatedUser,
    client: Pick<Prisma.TransactionClient, "organizationMembership"> = this
      .prisma,
  ): Promise<void> {
    if (!user.rootOrganizationId) throw new DisputeForbiddenError();
    const membership = await client.organizationMembership.findFirst({
      where: {
        userId: user.userId,
        organizationId: resolverOrganizationId,
        role: "ADMIN",
        status: "APPROVED",
        user: { status: "ACTIVE" },
        organization: {
          rootOrganizationId: user.rootOrganizationId,
          status: "ACTIVE",
        },
      },
      select: { id: true },
    });
    if (!membership) throw new DisputeForbiddenError();
  }

  private handleError(error: unknown, operation: string): never {
    if (error instanceof HttpException) throw error;
    throw new DisputeOperationError(operation);
  }
}
