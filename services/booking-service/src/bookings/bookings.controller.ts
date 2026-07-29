import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  AuthenticatedUser,
  CurrentUser,
  JwtAuthGuard,
} from "@resourcehive/service-auth";
import { BookingCreationService } from "./booking-creation.service";
import { CreateBookingDto } from "./dto/create-booking.dto";

@ApiTags("bookings")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("bookings")
export class BookingsController {
  constructor(private readonly bookingCreation: BookingCreationService) {}

  @Post()
  @ApiCreatedResponse({
    description: "Booking confirmed and points deducted atomically",
  })
  @ApiUnauthorizedResponse({
    description: "Authentication or active membership is missing",
  })
  @ApiForbiddenResponse({
    description: "The user cannot access the slot's resource",
  })
  @ApiNotFoundResponse({
    description: "The slot does not exist in the user's tenant",
  })
  @ApiConflictResponse({
    description:
      "The slot is unavailable, points are insufficient, or a concurrent update prevented booking",
  })
  create(
    @Body() dto: CreateBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingCreation.create(dto.resourceSlotId, user);
  }
}
