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
  constructor(private readonly slots: SlotsService) {}

  @Post("slots")
  @ApiCreatedResponse({ description: "Slot created" })
  @ApiConflictResponse({ description: "Slot overlaps an existing slot" })
  create(@Body() dto: CreateSlotDto, @CurrentUser() user: AuthenticatedUser) {
    return this.slots.create(dto, user);
  }

  @Get("slots/:slotId")
  @ApiOkResponse({ description: "Tenant-visible slot" })
  @ApiNotFoundResponse({ description: "Slot not found or inaccessible" })
  findOne(
    @Param("slotId", ParseUUIDPipe) slotId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.slots.findOne(slotId, user);
  }

  @Get("resources/:resourceId/slots")
  @ApiOkResponse({ description: "Tenant-visible slot availability" })
  @ApiNotFoundResponse({ description: "Resource not found or inaccessible" })
  list(
    @Param("resourceId", ParseUUIDPipe) resourceId: string,
    @Query() query: ListSlotsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.slots.list(resourceId, query, user);
  }
}
