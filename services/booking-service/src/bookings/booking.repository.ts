import { Injectable } from "@nestjs/common";
import {
  BookingRecord,
  BookingTransactionClient,
  CreateConfirmedBookingInput,
} from "./booking.types";

@Injectable()
export class BookingRepository {
  createConfirmed(
    input: CreateConfirmedBookingInput,
    client: BookingTransactionClient,
  ): Promise<BookingRecord> {
    return client.booking.create({
      data: {
        resourceSlotId: input.resourceSlotId,
        userId: input.userId,
        status: "CONFIRMED",
      },
      include: {
        resourceSlot: {
          select: {
            startsAt: true,
            endsAt: true,
            resource: {
              select: {
                id: true,
                name: true,
                pointCost: true,
              },
            },
          },
        },
      },
    });
  }
}
