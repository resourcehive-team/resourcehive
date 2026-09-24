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
  UseInterceptors,
  Inject,
} from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import { UserCacheInterceptor } from "../common/interceptors/user-cache.interceptor";
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
import { BookingService } from "./booking.service";
import {
  CancelBookingDto,
  CreateBookingDto,
  GetOrgBookingsDto,
  GetUserBookingsDto,
} from "./bookings.dto";

@ApiTags("bookings")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("bookings")
export class BookingsController {
  constructor(
    private readonly bookings: BookingService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
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
  async create(
    @Body() dto: CreateBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    try {
      const result = await this.bookings.createBooking(
        dto.resourceSlotId,
        user,
      );
      await this.cacheManager.clear();
      return result;
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get("me")
  @ApiOkResponse({ description: "List of bookings for the current user" })
  @UseInterceptors(UserCacheInterceptor)
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
  @ApiOkResponse({ description: "List of bookings for admin's organizations" })
  @UseInterceptors(UserCacheInterceptor)
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
  @ApiOkResponse({ description: "Booking marked as completed" })
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
      const result = await this.bookings.completeBooking(
        bookingId,
        user.userId,
      );
      await this.cacheManager.clear();
      return result;
    } catch (error) {
      this.handleError(error);
    }
  }

  @Patch(":bookingId/cancel")
  @ApiOkResponse({ description: "Booking cancelled and points refunded" })
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
      const result = await this.bookings.cancelBooking(
        bookingId,
        user.userId,
        dto,
      );
      await this.cacheManager.clear();
      return result;
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    if (error instanceof HttpException) throw error;
    throw new InternalServerErrorException("Unable to process booking request");
  }
}
