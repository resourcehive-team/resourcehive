import { Injectable } from "@nestjs/common";
import { Prisma, PrismaService } from "@resourcehive/database";
import { AuthenticatedUser } from "@resourcehive/service-auth";
import { PointLedgerService } from "../points/point-ledger.service";
import {
  BookingConcurrentConflictError,
  BookingTransactionConflictError,
} from "./booking-creation.errors";
import { BookingRepository } from "./booking.repository";
import { BookingValidationService } from "./booking-validation.service";
import { CreatedBooking } from "./booking.types";

const MAX_SERIALIZATION_ATTEMPTS = 3;

@Injectable()
export class BookingCreationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: BookingValidationService,
    private readonly bookings: BookingRepository,
    private readonly points: PointLedgerService,
  ) {}

  async create(
    resourceSlotId: string,
    user: AuthenticatedUser,
  ): Promise<CreatedBooking> {
    for (let attempt = 1; attempt <= MAX_SERIALIZATION_ATTEMPTS; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          (transaction) =>
            this.createWithinTransaction(resourceSlotId, user, transaction),
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (this.isUniqueConstraintConflict(error)) {
          throw new BookingConcurrentConflictError();
        }
        if (!this.isSerializationConflict(error)) {
          throw error;
        }
        if (attempt === MAX_SERIALIZATION_ATTEMPTS) {
          throw new BookingTransactionConflictError();
        }
      }
    }

    throw new BookingTransactionConflictError();
  }

  async createWithinTransaction(
    resourceSlotId: string,
    user: AuthenticatedUser,
    transaction: Prisma.TransactionClient,
  ): Promise<CreatedBooking> {
    const context = await this.validation.validate(
      resourceSlotId,
      user,
      transaction,
    );
    const booking = await this.bookings.createConfirmed(
      {
        resourceSlotId: context.resourceSlotId,
        userId: context.userId,
      },
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
