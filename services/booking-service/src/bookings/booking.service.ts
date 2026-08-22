import { HttpException, Injectable } from "@nestjs/common";
import { Prisma, PrismaService } from "@resourcehive/database";
import { AuthenticatedUser } from "@resourcehive/service-auth";
import { BookingAuthorizationService } from "../authorization/booking-authorization.service";
import { PointLedgerService } from "../points/point-ledger.service";
import { SlotRepository } from "../slots/slot.repository";
import {
  BookingAdministratorMembershipRequiredError,
  BookingAdministratorRequiredError,
  BookingCancellationConflictError,
  BookingCancellationInputError,
  BookingCancellationStartedError,
  BookingCannotBeCancelledError,
  BookingCannotBeCompletedError,
  BookingConcurrentConflictError,
  BookingNotFoundError,
  BookingOperationError,
  BookingPointCostInvalidError,
  BookingResourceAccessDeniedError,
  BookingResourceInactiveError,
  BookingSlotNotFoundError,
  BookingSlotStartedError,
  BookingSlotUnavailableError,
  BookingTransactionConflictError,
} from "./booking.errors";
import { BookingRepository } from "./booking.repository";
import {
  CancelledBookingRecord,
  CreatedBooking,
  OrganizationBookingRecord,
  BookingRecord,
  ValidatedBookingContext,
} from "./booking.types";
import {
  CancelBookingDto,
  GetOrgBookingsDto,
  GetUserBookingsDto,
} from "./bookings.dto";
import { BookingStatus } from "./bookingStatus";

const MAX_SERIALIZATION_ATTEMPTS = 3;

const organizationBookingInclude = {
  user: {
    select: {
      firstName: true,
      lastName: true,
      email: true,
      status: true,
      emailVerifiedAt: true,
      createdAt: true,
    },
  },
  resourceSlot: {
    select: {
      startsAt: true,
      endsAt: true,
      status: true,
      resource: {
        select: {
          id: true,
          name: true,
          pointCost: true,
          ownerOrganizationId: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: BookingAuthorizationService,
    private readonly slots: SlotRepository,
    private readonly points: PointLedgerService,
    private readonly bookings: BookingRepository,
  ) {}

  async createBooking(
    resourceSlotId: string,
    user: AuthenticatedUser,
  ): Promise<CreatedBooking> {
    try {
      for (
        let attempt = 1;
        attempt <= MAX_SERIALIZATION_ATTEMPTS;
        attempt += 1
      ) {
        try {
          return await this.prisma.$transaction(
            (transaction) =>
              this.createWithinTransaction(resourceSlotId, user, transaction),
            {
              isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
              maxWait: 10000,
              timeout: 30000,
            },
          );
        } catch (error) {
          if (this.isUniqueConstraintConflict(error)) {
            throw new BookingConcurrentConflictError();
          }
          if (!this.isSerializationConflict(error)) throw error;
          if (attempt === MAX_SERIALIZATION_ATTEMPTS) {
            throw new BookingTransactionConflictError();
          }
        }
      }

      throw new BookingTransactionConflictError();
    } catch (error) {
      this.handleError(error, "create");
    }
  }

  async validateBooking(
    resourceSlotId: string,
    user: AuthenticatedUser,
    client?: Prisma.TransactionClient,
  ): Promise<ValidatedBookingContext> {
    try {
      const context = client
        ? await this.authorization.resolve(user, client)
        : await this.authorization.resolve(user);
      const lookup = {
        slotId: resourceSlotId,
        rootOrganizationId: context.rootOrganizationId,
      };
      const slot = client
        ? await this.slots.findById(lookup, client)
        : await this.slots.findById(lookup);

      if (!slot) throw new BookingSlotNotFoundError();
      if (slot.resource.status !== "ACTIVE") {
        throw new BookingResourceInactiveError();
      }

      const canAccess = client
        ? await this.slots.canAccessResource(
            slot.resourceId,
            context.userId,
            context.rootOrganizationId,
            client,
          )
        : await this.slots.canAccessResource(
            slot.resourceId,
            context.userId,
            context.rootOrganizationId,
          );

      if (!canAccess) throw new BookingResourceAccessDeniedError();
      if (slot.startsAt <= new Date()) throw new BookingSlotStartedError();
      if (slot.bookings.length > 0) throw new BookingSlotUnavailableError();
      if (
        !Number.isInteger(slot.resource.pointCost) ||
        slot.resource.pointCost < 0
      ) {
        throw new BookingPointCostInvalidError();
      }

      if (client) {
        await this.points.assertSufficientBalance(
          context.userId,
          slot.resource.pointCost,
          client,
        );
      } else {
        await this.points.assertSufficientBalance(
          context.userId,
          slot.resource.pointCost,
        );
      }

      return {
        userId: context.userId,
        rootOrganizationId: context.rootOrganizationId,
        resourceId: slot.resourceId,
        resourceSlotId: slot.id,
        pointCost: slot.resource.pointCost,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
      };
    } catch (error) {
      this.handleError(error, "validate");
    }
  }

  async cancelBooking(
    bookingId: string,
    actorUserId: string,
    input: CancelBookingDto,
  ): Promise<CancelledBookingRecord> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const booking = await transaction.booking.findUnique({
          where: { id: bookingId },
          include: organizationBookingInclude,
        });

        if (!booking) throw new BookingNotFoundError();
        const bookingStatus = booking.status as BookingStatus;
        if (bookingStatus !== BookingStatus.CONFIRMED) {
          throw new BookingCannotBeCancelledError();
        }

        const isUserCancellation =
          booking.userId === actorUserId &&
          input.makeSlotAvailable === undefined;
        const now = new Date();

        if (isUserCancellation) {
          if (booking.resourceSlot.startsAt <= now) {
            throw new BookingCancellationStartedError();
          }
        } else {
          await this.assertOrganizationAdministrator(
            actorUserId,
            booking.resourceSlot.resource.ownerOrganizationId,
            transaction,
          );
          if (input.makeSlotAvailable === undefined) {
            throw new BookingCancellationInputError();
          }
        }

        const deduction = await transaction.pointTransaction.findFirst({
          where: {
            bookingId,
            userId: booking.userId,
            transactionType: "BOOKING",
          },
          select: { amount: true },
        });
        const deductedPoints = Math.abs(deduction?.amount ?? 0);
        const refundPoints = isUserCancellation
          ? Math.ceil(deductedPoints / 2)
          : deductedPoints;
        const slotStatus =
          isUserCancellation || input.makeSlotAvailable
            ? "PUBLISHED"
            : "WITHDRAWN";

        const updateResult = await transaction.booking.updateMany({
          where: { id: bookingId, status: BookingStatus.CONFIRMED },
          data: {
            status: BookingStatus.CANCELLED,
            cancelledAt: now,
            cancelledByUserId: actorUserId,
            cancellationReason: input.reason?.trim() || null,
          },
        });
        if (updateResult.count !== 1) {
          throw new BookingCancellationConflictError();
        }

        await transaction.resourceSlot.update({
          where: { id: booking.resourceSlotId },
          data: {
            status: slotStatus,
            withdrawnAt: slotStatus === "WITHDRAWN" ? now : null,
          },
        });

        if (refundPoints > 0) {
          await this.points.appendBookingRefund(
            {
              userId: booking.userId,
              bookingId,
              amount: refundPoints,
              description: isUserCancellation
                ? `50% refund for cancelled booking for ${booking.resourceSlot.resource.name}`
                : `Full refund for administrator-cancelled booking for ${booking.resourceSlot.resource.name}`,
            },
            transaction,
          );
        }

        const cancelledBooking = await transaction.booking.findUnique({
          where: { id: bookingId },
          include: organizationBookingInclude,
        });
        if (!cancelledBooking) throw new BookingNotFoundError();

        return { ...cancelledBooking, refundPoints, slotStatus };
      });
    } catch (error) {
      this.handleError(error, "cancel");
    }
  }

  async completeBooking(
    bookingId: string,
    administratorUserId: string,
  ): Promise<OrganizationBookingRecord> {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: organizationBookingInclude,
      });
      if (!booking) throw new BookingNotFoundError();

      await this.assertOrganizationAdministrator(
        administratorUserId,
        booking.resourceSlot.resource.ownerOrganizationId,
        this.prisma,
      );
      const bookingStatus = booking.status as BookingStatus;
      if (bookingStatus === BookingStatus.COMPLETED) return booking;
      if (bookingStatus !== BookingStatus.CONFIRMED) {
        throw new BookingCannotBeCompletedError();
      }

      return await this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.COMPLETED, completedAt: new Date() },
        include: organizationBookingInclude,
      });
    } catch (error) {
      this.handleError(error, "complete");
    }
  }

  async getUserBookings(
    userId: string,
    query: GetUserBookingsDto,
  ): Promise<BookingRecord[]> {
    try {
      const { skip, take, status } = query;
      return await this.prisma.booking.findMany({
        where: { userId, ...(status ? { status } : {}) },
        skip,
        take,
        include: {
          resourceSlot: {
            select: {
              startsAt: true,
              endsAt: true,
              resource: { select: { id: true, name: true, pointCost: true } },
            },
          },
        },
      });
    } catch (error) {
      this.handleError(error, "retrieve user");
    }
  }

  async getOrgBookings(
    userId: string,
    query: GetOrgBookingsDto,
  ): Promise<OrganizationBookingRecord[]> {
    try {
      const memberships = await this.prisma.organizationMembership.findMany({
        where: { userId, role: "ADMIN", status: "APPROVED" },
        select: { organizationId: true },
      });
      if (memberships.length === 0) {
        throw new BookingAdministratorMembershipRequiredError();
      }

      const { skip, take, status } = query;
      return await this.prisma.booking.findMany({
        where: {
          resourceSlot: {
            resource: {
              ownerOrganizationId: {
                in: memberships.map(({ organizationId }) => organizationId),
              },
            },
          },
          ...(status ? { status } : {}),
        },
        skip,
        take,
        include: organizationBookingInclude,
      });
    } catch (error) {
      this.handleError(error, "retrieve organization");
    }
  }

  private async createWithinTransaction(
    resourceSlotId: string,
    user: AuthenticatedUser,
    transaction: Prisma.TransactionClient,
  ): Promise<CreatedBooking> {
    const context = await this.validateBooking(
      resourceSlotId,
      user,
      transaction,
    );
    const booking = await this.bookings.createConfirmed(
      { resourceSlotId: context.resourceSlotId, userId: context.userId },
      transaction,
    );

    if (context.pointCost > 0) {
      await this.points.appendBookingDeduction(
        {
          userId: context.userId,
          bookingId: booking.id,
          amount: -context.pointCost,
          description: `Booking for ${booking.resourceSlot.resource.name}`,
        },
        transaction,
      );
    }

    return {
      id: booking.id,
      resourceSlotId: booking.resourceSlotId,
      resourceId: booking.resourceSlot.resource.id,
      resourceName: booking.resourceSlot.resource.name,
      userId: booking.userId,
      status: booking.status,
      startsAt: booking.resourceSlot.startsAt,
      endsAt: booking.resourceSlot.endsAt,
      pointsDeducted: context.pointCost,
      createdAt: booking.createdAt,
    };
  }

  private async assertOrganizationAdministrator(
    userId: string,
    organizationId: string,
    client: Pick<Prisma.TransactionClient, "organizationMembership">,
  ): Promise<void> {
    const membership = await client.organizationMembership.findFirst({
      where: {
        userId,
        organizationId,
        role: "ADMIN",
        status: "APPROVED",
      },
      select: { id: true },
    });
    if (!membership) throw new BookingAdministratorRequiredError();
  }

  private handleError(error: unknown, operation: string): never {
    if (error instanceof HttpException) throw error;
    throw new BookingOperationError(operation);
  }

  private isUniqueConstraintConflict(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    );
  }

  private isSerializationConflict(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    );
  }
}
