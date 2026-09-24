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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  AuthenticatedUser,
  CurrentUser,
  JwtAuthGuard,
} from "@resourcehive/service-auth";
import { CreateSlotDto, ListSlotsDto } from "./slot.dto";
import { SlotsService } from "./slots.service";

@ApiTags("slots")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class SlotsController {
  constructor(
    private readonly slots: SlotsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Post("slots")
  @ApiCreatedResponse({ description: "Slot created" })
  @ApiConflictResponse({ description: "Slot overlaps an existing slot" })
  async create(@Body() dto: CreateSlotDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.slots.create(dto, user);
    await this.cacheManager.clear();
    return result;
  }

  @Get("slots/:slotId")
  @ApiOkResponse({ description: "Tenant-visible slot" })
  @ApiNotFoundResponse({ description: "Slot not found or inaccessible" })
  @UseInterceptors(UserCacheInterceptor)
  findOne(
    @Param("slotId", ParseUUIDPipe) slotId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.slots.findOne(slotId, user);
  }

  @Get("resources/:resourceId/slots")
  @ApiOkResponse({ description: "Tenant-visible slot availability" })
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

