import { HttpException, Injectable } from "@nestjs/common";
import { PrismaService } from "@resourcehive/database";
import { AuthenticatedUser } from "@resourcehive/service-auth";
import { BookingAuthorizationService } from "../authorization/booking-authorization.service";
import { SlotRepository } from "../slots/slot.repository";
import { CreateDisputeDto, UpdateDisputeDto } from "./dispute.dto";
import { DisputeRepository } from "./dispute.repository";
import {
  DisputeAdministratorRequiredError,
  DisputeAlreadyExistsError,
  DisputeBookingNotEligibleError,
  DisputeBookingNotFoundError,
  DisputeForbiddenError,
  DisputeInvalidTransitionError,
  DisputeNotFoundError,
  DisputeOperationError,
  DisputeResolutionNotesRequiredError,
} from "./dispute.errors";
import { DisputeRecord, DisputeStatus } from "./dispute.types";

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
    private readonly authorization: BookingAuthorizationService,
    private readonly slots: SlotRepository,
    private readonly disputes: DisputeRepository,
  ) {}

  async open(
    dto: CreateDisputeDto,
    user: AuthenticatedUser,
  ): Promise<DisputeRecord> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const booking = await transaction.booking.findFirst({
          where: { id: dto.bookingId, userId: user.userId },
          select: { id: true, status: true },
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
            submittedByUserId: user.userId,
            reason: dto.reason,
            description: dto.description,
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
          transaction,
        );
        return dispute;
      });
    } catch (error) {
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

  async listForOrg(user: AuthenticatedUser): Promise<DisputeRecord[]> {
    try {
      const memberships = await this.prisma.organizationMembership.findMany({
        where: { userId: user.userId, role: "ADMIN", status: "APPROVED" },
        select: { organizationId: true },
      });
      if (memberships.length === 0) {
        throw new DisputeAdministratorRequiredError();
      }
      return await this.disputes.findForOrganizations(
        memberships.map((m) => m.organizationId),
      );
    } catch (error) {
      this.handleError(error, "retrieve");
    }
  }

  async getById(id: string, user: AuthenticatedUser): Promise<DisputeRecord> {
    try {
      const dispute = await this.disputes.findById(id);
      if (!dispute) throw new DisputeNotFoundError();
      if (dispute.submittedByUserId !== user.userId) {
        await this.assertCanManage(
          dispute.booking.resourceSlot.resource.id,
          user,
        );
      }
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
      const dispute = await this.disputes.findById(id);
      if (!dispute) throw new DisputeNotFoundError();
      await this.assertCanManage(
        dispute.booking.resourceSlot.resource.id,
        user,
      );

      const nextStatus = dto.status ?? (dispute.status as DisputeStatus);
      if (dto.status && dto.status !== dispute.status) {
        const allowed = ALLOWED_TRANSITIONS[dispute.status as DisputeStatus];
        if (!allowed?.includes(dto.status)) {
          throw new DisputeInvalidTransitionError();
        }
      }
      const isTerminal = TERMINAL_STATUSES.includes(nextStatus);
      if (isTerminal && !dto.resolutionNotes && !dispute.resolutionNotes) {
        throw new DisputeResolutionNotesRequiredError();
      }

      return await this.prisma.$transaction(async (transaction) => {
        const updated = await this.disputes.applyTransition(
          id,
          dispute.booking.resourceSlot.resource.id,
          user.userId,
          dto,
          isTerminal,
          transaction,
        );
        if (dto.status && dto.status !== dispute.status) {
          await this.disputes.addEvent(
            id,
            user.userId,
            dispute.status,
            dto.status,
            dto.resolutionNotes,
            transaction,
          );
        }
        return updated;
      });
    } catch (error) {
      this.handleError(error, "update");
    }
  }

  private async assertCanManage(
    resourceId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    const context = await this.authorization.resolve(user);
    const canManage = await this.slots.canManageResource(
      resourceId,
      context.userId,
      context.rootOrganizationId,
    );
    if (!canManage) throw new DisputeForbiddenError();
  }

  private handleError(error: unknown, operation: string): never {
    if (error instanceof HttpException) throw error;
    throw new DisputeOperationError(operation);
  }
}
