import {
  Body,
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiTags,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiOkResponse,
} from "@nestjs/swagger";
import {
  AuthenticatedUser,
  CurrentUser,
  JwtAuthGuard,
} from "@resourcehive/service-auth";
import { BookingService } from "./booking.service";
import {
  CancelBookingDto,
  CreateBookingDto,
  GetOrgBookingsDto,
  GetUserBookingsDto,
} from "./bookings.dto";
import {
  CancelledBookingResponseDto,
  CreatedBookingResponseDto,
  OrganizationBookingResponseDto,
  BookingResponseDto,
} from "../docs/booking-responses.dto";

@ApiTags("bookings")
@ApiBearerAuth()
@ApiCookieAuth("resourcehive_access_token")
@UseGuards(JwtAuthGuard)
@Controller("bookings")
export class BookingsController {
  constructor(private readonly bookings: BookingService) {}

  @Post()
  @ApiOperation({ summary: "Create a booking for an available resource slot" })
  @ApiCreatedResponse({
    description: "Booking confirmed and points deducted atomically",
    type: CreatedBookingResponseDto,
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
  async create(
    @Body() dto: CreateBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    try {
      return await this.bookings.createBooking(dto.resourceSlotId, user);
    } catch (error) {
      this.handleError(error);
    }
  }
  @Get("me")
  @ApiOperation({ summary: "List bookings for the current user" })
  @ApiOkResponse({
    description: "List of bookings for the current user",
    type: [BookingResponseDto],
  })
  async getMyBookings(
    @Query() query: GetUserBookingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    try {
      return await this.bookings.getUserBookings(user.userId, query);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get("org")
  @ApiOperation({
    summary: "List bookings for organizations administered by the current user",
  })
  @ApiOkResponse({
    description: "List of bookings for admin's organizations",
    type: [OrganizationBookingResponseDto],
  })
  async getOrgBookings(
    @Query() query: GetOrgBookingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    try {
      return await this.bookings.getOrgBookings(user.userId, query);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Patch(":bookingId/complete")
  @ApiOperation({ summary: "Mark a booking as completed" })
  @ApiOkResponse({
    description: "Booking marked as completed",
    type: OrganizationBookingResponseDto,
  })
  @ApiForbiddenResponse({
    description: "The user does not administer the resource's organization",
  })
  @ApiNotFoundResponse({ description: "Booking not found" })
  @ApiConflictResponse({
    description: "The booking is not in a confirmable state",
  })
  async complete(
    @Param("bookingId", ParseUUIDPipe) bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    try {
      return await this.bookings.completeBooking(bookingId, user.userId);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Patch(":bookingId/cancel")
  @ApiOperation({
    summary: "Cancel a booking and refund points when applicable",
  })
  @ApiOkResponse({
    description: "Booking cancelled and points refunded",
    type: CancelledBookingResponseDto,
  })
  @ApiForbiddenResponse({
    description: "The user cannot cancel this booking",
  })
  @ApiNotFoundResponse({ description: "Booking not found" })
  @ApiConflictResponse({
    description: "The booking cannot be cancelled in its current state",
  })
  async cancel(
    @Param("bookingId", ParseUUIDPipe) bookingId: string,
    @Body() dto: CancelBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    try {
      return await this.bookings.cancelBooking(bookingId, user.userId, dto);
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    if (error instanceof HttpException) throw error;
    throw new InternalServerErrorException("Unable to process booking request");
  }
}
