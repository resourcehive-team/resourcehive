import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
  ApiCookieAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiOperation,
} from "@nestjs/swagger";
import {
  AuthenticatedUser,
  CurrentUser,
  JwtAuthGuard,
} from "@resourcehive/service-auth";
import { SlotResponseDto } from "../docs/booking-responses.dto";
import { CreateSlotDto, ListSlotsDto } from "./slot.dto";
import { SlotsService } from "./slots.service";

@ApiTags("slots")
@ApiBearerAuth()
@ApiCookieAuth("resourcehive_access_token")
@UseGuards(JwtAuthGuard)
@Controller()
export class SlotsController {
  constructor(
    private readonly slots: SlotsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Post("slots")
  @ApiOperation({ summary: "Create a resource availability slot" })
  @ApiCreatedResponse({ description: "Slot created", type: SlotResponseDto })
  @ApiConflictResponse({ description: "Slot overlaps an existing slot" })
  async create(
    @Body() dto: CreateSlotDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.slots.create(dto, user);
    await this.cacheManager.clear();
    return result;
  }

  @Get("slots/:slotId")
  @ApiOperation({ summary: "Get a visible resource slot" })
  @ApiOkResponse({ description: "Tenant-visible slot", type: SlotResponseDto })
  @ApiNotFoundResponse({ description: "Slot not found or inaccessible" })
  @UseInterceptors(UserCacheInterceptor)
  findOne(
    @Param("slotId", ParseUUIDPipe) slotId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.slots.findOne(slotId, user);
  }

  @Get("resources/:resourceId/slots")
  @ApiOperation({ summary: "List visible slots for a resource" })
  @ApiOkResponse({
    description: "Tenant-visible slot availability",
    type: [SlotResponseDto],
  })
  @ApiNotFoundResponse({ description: "Resource not found or inaccessible" })
  @UseInterceptors(UserCacheInterceptor)
  list(
    @Param("resourceId", ParseUUIDPipe) resourceId: string,
    @Query() query: ListSlotsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.slots.list(resourceId, query, user);
  }
}
