import { Injectable } from "@nestjs/common";
import { Prisma } from "@resourcehive/database";
import { AuthenticatedUser } from "@resourcehive/service-auth";
import { BookingAuthorizationService } from "../authorization/booking-authorization.service";
import { PointLedgerService } from "../points/point-ledger.service";
import { SlotRepository } from "../slots/slot.repository";
import {
  BookingPointCostInvalidError,
  BookingResourceAccessDeniedError,
  BookingResourceInactiveError,
  BookingSlotNotFoundError,
  BookingSlotStartedError,
  BookingSlotUnavailableError,
} from "./booking-validation.errors";
import { ValidatedBookingContext } from "./booking-validation.types";

@Injectable()
export class BookingValidationService {
  constructor(
    private readonly authorization: BookingAuthorizationService,
    private readonly slots: SlotRepository,
    private readonly points: PointLedgerService,
  ) {}

  async validate(
    resourceSlotId: string,
    user: AuthenticatedUser,
    client?: Prisma.TransactionClient,
  ): Promise<ValidatedBookingContext> {
    const context = client
      ? await this.authorization.resolve(user, client)
      : await this.authorization.resolve(user);
    const slotLookup = {
      slotId: resourceSlotId,
      rootOrganizationId: context.rootOrganizationId,
    };
    const slot = client
      ? await this.slots.findById(slotLookup, client)
      : await this.slots.findById(slotLookup);

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
  }
}
