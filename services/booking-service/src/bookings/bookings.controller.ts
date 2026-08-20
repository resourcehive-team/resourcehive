import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiOkResponse,
} from "@nestjs/swagger";
import {
  AuthenticatedUser,
  CurrentUser,
  JwtAuthGuard,
} from "@resourcehive/service-auth";
import { BookingCreationService } from "./booking-creation.service";
import { BookingCompletionService } from "./booking-completion.service";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { GetUserBookingsDto } from "./dto/get-user-bookings.dto";
import { GetOrgBookingsDto } from "./dto/get-org-bookings.dto";
import { BookingReadService } from "./booking-read.service";

@ApiTags("bookings")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("bookings")
export class BookingsController {
  constructor(
    private readonly bookingCreation: BookingCreationService,
    private readonly bookingRead: BookingReadService,
    private readonly bookingCompletion: BookingCompletionService,
  ) {}

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
  @Get("me")
  @ApiOkResponse({ description: "List of bookings for the current user" })
  async getMyBookings(
    @Query() query: GetUserBookingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingRead.getUserBookings(user.userId, query);
  }

  @Get("org")
  @ApiOkResponse({ description: "List of bookings for admin's organizations" })
  async getOrgBookings(
    @Query() query: GetOrgBookingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingRead.getOrgBookings(user.userId, query);
  }

  @Patch(":bookingId/complete")
  @ApiOkResponse({ description: "Booking marked as completed" })
  @ApiForbiddenResponse({
    description: "The user does not administer the resource's organization",
  })
  @ApiNotFoundResponse({ description: "Booking not found" })
  @ApiConflictResponse({
    description: "The booking is not in a confirmable state",
  })
  complete(
    @Param("bookingId", ParseUUIDPipe) bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingCompletion.complete(bookingId, user.userId);
  }
}
