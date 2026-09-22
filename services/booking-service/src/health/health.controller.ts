import { Controller, Get } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  HealthResponse,
  HealthService,
  LivenessResponse,
} from "./health.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get("live")
  @ApiOperation({ summary: "Check that the process is running" })
  @ApiOkResponse({ description: "Service process is running" })
  checkLiveness(): LivenessResponse {
    return this.healthService.checkLiveness();
  }

  @Get("ready")
  @ApiOperation({ summary: "Check service and database readiness" })
  @ApiOkResponse({ description: "Service and database are ready" })
  @ApiServiceUnavailableResponse({ description: "Database is unavailable" })
  checkReadiness(): Promise<HealthResponse> {
    return this.healthService.checkReadiness();
  }
}
