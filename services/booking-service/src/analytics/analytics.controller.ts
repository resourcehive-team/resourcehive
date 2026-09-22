import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  AuthenticatedUser,
  CurrentUser,
  JwtAuthGuard,
} from "@resourcehive/service-auth";
import { AnalyticsService } from "./analytics.service";
import { DateRangeDto } from "./analytics.dto";

@ApiTags("analytics")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("org")
  async forOrg(
    @Query() range: DateRangeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const [inventoryDemand, userSegmentation, peakTimes] = await Promise.all([
      this.analytics.inventoryDemand(user, range),
      this.analytics.userSegmentation(user, range),
      this.analytics.peakTimesForOrg(user, range),
    ]);
    return { inventoryDemand, userSegmentation, peakTimes };
  }

  @Get("me")
  async forMe(
    @Query() range: DateRangeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const [usage, peakTimes] = await Promise.all([
      this.analytics.myUsage(user, range),
      this.analytics.peakTimesForTenant(user, range),
    ]);
    return { usage, peakTimes };
  }

  @Get("platform")
  async platform(
    @Query() range: DateRangeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { companies: await this.analytics.platformOverview(user, range) };
  }
}
