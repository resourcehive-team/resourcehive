import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  AuthenticatedUser,
  CurrentUser,
  JwtAuthGuard,
} from "@resourcehive/service-auth";
import { CreateDisputeDto, UpdateDisputeDto } from "./dispute.dto";
import { DisputeService } from "./dispute.service";

@ApiTags("disputes")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("disputes")
export class DisputesController {
  constructor(private readonly disputes: DisputeService) {}

  @Post()
  create(
    @Body() dto: CreateDisputeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.disputes.open(dto, user);
  }

  @Get("me")
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.disputes.listMine(user);
  }

  @Get("org")
  listForOrg(@CurrentUser() user: AuthenticatedUser) {
    return this.disputes.listForOrg(user);
  }

  @Get(":disputeId")
  findOne(
    @Param("disputeId", ParseUUIDPipe) disputeId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.disputes.getById(disputeId, user);
  }

  @Patch(":disputeId")
  update(
    @Param("disputeId", ParseUUIDPipe) disputeId: string,
    @Body() dto: UpdateDisputeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.disputes.transition(disputeId, dto, user);
  }
}
