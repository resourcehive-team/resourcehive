import { Injectable } from '@nestjs/common';
import { PrismaService } from '@resourcehive/database';
import { GetUserBookingsDto } from './dto/get-user-bookings.dto';
import { GetOrgBookingsDto } from './dto/get-org-bookings.dto';
import { BookingRecord } from './booking.types';

@Injectable()
export class BookingReadService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns bookings made by a specific user with optional pagination and status filter */
  async getUserBookings(userId: string, query: GetUserBookingsDto): Promise<BookingRecord[]> {
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

  /** Returns bookings for resources owned by given organization IDs (admin view) */
  async getOrgBookings(orgIds: string[], query: GetOrgBookingsDto): Promise<BookingRecord[]> {
    const { skip, take, status } = query;
    return this.prisma.booking.findMany({
      where: {
        resourceSlot: { resource: { ownerOrganizationId: { in: orgIds } } },
        ...(status ? { status } : {}),
      },
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
}
