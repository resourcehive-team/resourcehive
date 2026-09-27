import { HttpException, Injectable } from "@nestjs/common";
import { PrismaService } from "@resourcehive/database";
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
  DisputeTenantAdminCannotOpenError,
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
      const resolverOrganizationId = await this.resolveResolverOrganizationId(
        user.userId,
      );

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
            resolverOrganizationId,
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

  async listForOrg(user: AuthenticatedUser): Promise<DisputeWithSubmitter[]> {
    try {
      const organizationIds = await this.administeredOrganizationIds(
        user.userId,
      );
      if (organizationIds.length === 0) {
        throw new DisputeAdministratorRequiredError();
      }
      return await this.disputes.findForResolverOrganizations(organizationIds);
    } catch (error) {
      this.handleError(error, "retrieve");
    }
  }

  async getById(id: string, user: AuthenticatedUser): Promise<DisputeRecord> {
    try {
      const dispute = await this.disputes.findById(id);
      if (!dispute) throw new DisputeNotFoundError();
      if (dispute.submittedByUserId !== user.userId) {
        await this.assertCanManage(dispute.resolverOrganizationId, user);
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
      await this.assertCanManage(dispute.resolverOrganizationId, user);

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

  /**
   * The submitter's own organization resolves their disputes. If the
   * submitter is themselves an organization admin, resolution escalates to
   * their closest parent organization's admin, since there is no one above
   * them within their own organization. A tenant (root organization) admin
   * has no parent to escalate to and cannot open disputes.
   */
  private async resolveResolverOrganizationId(userId: string): Promise<string> {
    const membership = await this.prisma.organizationMembership.findFirst({
      where: { userId, status: "APPROVED" },
      orderBy: { joinedAt: "asc" },
      select: { organizationId: true, role: true },
    });
    if (!membership) throw new DisputeNoOrganizationError();
    if (membership.role !== "ADMIN") return membership.organizationId;

    const organization = await this.prisma.organization.findUnique({
      where: { id: membership.organizationId },
      select: { parentId: true },
    });
    if (!organization?.parentId) {
      throw new DisputeTenantAdminCannotOpenError();
    }
    return organization.parentId;
  }

  private async administeredOrganizationIds(userId: string): Promise<string[]> {
    const memberships = await this.prisma.organizationMembership.findMany({
      where: { userId, role: "ADMIN", status: "APPROVED" },
      select: { organizationId: true },
    });
    return memberships.map((m) => m.organizationId);
  }

  private async assertCanManage(
    resolverOrganizationId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        userId: user.userId,
        organizationId: resolverOrganizationId,
        role: "ADMIN",
        status: "APPROVED",
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
