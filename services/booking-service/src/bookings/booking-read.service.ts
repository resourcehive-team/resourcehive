import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "@resourcehive/database";
import { GetUserBookingsDto } from "./dto/get-user-bookings.dto";
import { GetOrgBookingsDto } from "./dto/get-org-bookings.dto";
import { BookingRecord, OrganizationBookingRecord } from "./booking.types";

@Injectable()
export class BookingReadService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns bookings made by a specific user with optional pagination and status filter */
  async getUserBookings(
    userId: string,
    query: GetUserBookingsDto,
  ): Promise<BookingRecord[]> {
    const { skip, take, status } = query;
    return this.prisma.booking.findMany({
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
  }

  /** Returns bookings owned by organizations the user directly administers. */
  async getOrgBookings(
    userId: string,
    query: GetOrgBookingsDto,
  ): Promise<OrganizationBookingRecord[]> {
    const administratorMemberships =
      await this.prisma.organizationMembership.findMany({
        where: {
          userId,
          role: "ADMIN",
          status: "APPROVED",
        },
        select: { organizationId: true },
      });

    if (administratorMemberships.length === 0) {
      throw new ForbiddenException(
        "Approved administrator membership is required",
      );
    }

    const organizationIds = administratorMemberships.map(
      (membership) => membership.organizationId,
    );
    const { skip, take, status } = query;

    return this.prisma.booking.findMany({
      where: {
        resourceSlot: {
          resource: { ownerOrganizationId: { in: organizationIds } },
        },
        ...(status ? { status } : {}),
      },
      skip,
      take,
      include: {
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
            resource: { select: { id: true, name: true, pointCost: true } },
          },
        },
      },
    });
  }
}
