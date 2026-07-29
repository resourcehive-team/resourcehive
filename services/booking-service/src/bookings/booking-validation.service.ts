import { Injectable } from "@nestjs/common";
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
  ): Promise<ValidatedBookingContext> {
    const context = await this.authorization.resolve(user);
    const slot = await this.slots.findById({
      slotId: resourceSlotId,
      rootOrganizationId: context.rootOrganizationId,
    });

    if (!slot) throw new BookingSlotNotFoundError();
    if (slot.resource.status !== "ACTIVE") {
      throw new BookingResourceInactiveError();
    }

    const canAccess = await this.slots.canAccessResource(
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

    await this.points.assertSufficientBalance(
      context.userId,
      slot.resource.pointCost,
    );

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
