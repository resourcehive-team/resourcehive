import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
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
  constructor(private readonly slots: SlotsService) {}

  @Post("slots")
  @ApiOperation({ summary: "Create a resource availability slot" })
  @ApiCreatedResponse({ description: "Slot created", type: SlotResponseDto })
  @ApiConflictResponse({ description: "Slot overlaps an existing slot" })
  create(@Body() dto: CreateSlotDto, @CurrentUser() user: AuthenticatedUser) {
    return this.slots.create(dto, user);
  }

  @Get("slots/:slotId")
  @ApiOperation({ summary: "Get a visible resource slot" })
  @ApiOkResponse({ description: "Tenant-visible slot", type: SlotResponseDto })
  @ApiNotFoundResponse({ description: "Slot not found or inaccessible" })
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
  list(
    @Param("resourceId", ParseUUIDPipe) resourceId: string,
    @Query() query: ListSlotsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.slots.list(resourceId, query, user);
  }
}
