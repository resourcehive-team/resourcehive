import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, PrismaService } from "@resourcehive/database";
import { PointLedgerService } from "../points/point-ledger.service";
import { CancelledBookingRecord } from "./booking.types";
import { CancelBookingDto } from "./dto/cancel-booking.dto";

const bookingInclude = {
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
export class BookingCancellationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly points: PointLedgerService,
  ) {}

  cancel(
    bookingId: string,
    actorUserId: string,
    input: CancelBookingDto,
  ): Promise<CancelledBookingRecord> {
    return this.prisma.$transaction(async (transaction) => {
      const booking = await transaction.booking.findUnique({
        where: { id: bookingId },
        include: bookingInclude,
      });

      if (!booking) {
        throw new NotFoundException("Booking not found");
      }

      if (booking.status !== "CONFIRMED") {
        throw new ConflictException(
          "Only a confirmed booking can be cancelled",
        );
      }

      const isUserCancellation =
        booking.userId === actorUserId && input.makeSlotAvailable === undefined;
      const now = new Date();

      if (isUserCancellation) {
        if (booking.resourceSlot.startsAt <= now) {
          throw new ConflictException(
            "A booking cannot be cancelled after its slot starts",
          );
        }
      } else {
        await this.assertOrganizationAdministrator(
          actorUserId,
          booking.resourceSlot.resource.ownerOrganizationId,
          transaction,
        );

        if (input.makeSlotAvailable === undefined) {
          throw new BadRequestException(
            "makeSlotAvailable is required for an administrator cancellation",
          );
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
      const cancellationReason = input.reason?.trim() || null;

      const updateResult = await transaction.booking.updateMany({
        where: { id: bookingId, status: "CONFIRMED" },
        data: {
          status: "CANCELLED",
          cancelledAt: now,
          cancelledByUserId: actorUserId,
          cancellationReason,
        },
      });

      if (updateResult.count !== 1) {
        throw new ConflictException("The booking is no longer confirmed");
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
        include: bookingInclude,
      });

      if (!cancelledBooking) {
        throw new NotFoundException("Booking not found");
      }

      return {
        ...cancelledBooking,
        refundPoints,
        slotStatus,
      };
    });
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

    if (!membership) {
      throw new ForbiddenException(
        "Administrator access to the resource's organization is required",
      );
    }
  }
}
