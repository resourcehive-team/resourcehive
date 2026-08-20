import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@resourcehive/database";
import { OrganizationBookingRecord } from "./booking.types";

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
export class BookingCompletionService {
  constructor(private readonly prisma: PrismaService) {}

  async complete(
    bookingId: string,
    administratorUserId: string,
  ): Promise<OrganizationBookingRecord> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: bookingInclude,
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    const administratorMembership =
      await this.prisma.organizationMembership.findFirst({
        where: {
          userId: administratorUserId,
          organizationId: booking.resourceSlot.resource.ownerOrganizationId,
          role: "ADMIN",
          status: "APPROVED",
        },
        select: { id: true },
      });

    if (!administratorMembership) {
      throw new ForbiddenException(
        "Administrator access to the resource's organization is required",
      );
    }

    if (booking.status === "COMPLETED") {
      return booking;
    }

    if (booking.status !== "CONFIRMED") {
      throw new ConflictException(
        "Only a confirmed booking can be marked as completed",
      );
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
      include: bookingInclude,
    });
  }
}
