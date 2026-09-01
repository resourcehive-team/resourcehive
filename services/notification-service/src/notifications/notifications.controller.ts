import {
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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import {
  AuthenticatedUser,
  CurrentUser,
  JwtAuthGuard,
} from "@resourcehive/service-auth";
import { ListNotificationsDto } from "./dto/list-notifications.dto";
import { DevelopmentPushService } from "./development-push.service";
import { NotificationReadService } from "./notification-read.service";

@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationReadService,
    private readonly developmentPush: DevelopmentPushService,
  ) {}

  @Get()
  @ApiOkResponse({ description: "Authenticated user's notifications" })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListNotificationsDto,
  ) {
    return this.notifications.list(user, query);
  }

  @Patch("read-all")
  @ApiOkResponse({ description: "All unread notifications marked read" })
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.markAllRead(user);
  }

  @Post("test-push")
  @ApiOperation({
    summary: "Queue a push to the authenticated user's devices (local only)",
  })
  @ApiOkResponse({ description: "Development push queued" })
  @ApiNotFoundResponse({ description: "Unavailable in production" })
  sendTestPush(@CurrentUser() user: AuthenticatedUser) {
    return this.developmentPush.queue(user.userId);
  }

  @Get(":notificationId")
  @ApiOkResponse({ description: "Owned notification" })
  @ApiNotFoundResponse({
    description: "Notification not found or inaccessible",
  })
  findOne(
    @Param("notificationId", ParseUUIDPipe) notificationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notifications.findOne(notificationId, user);
  }

  @Patch(":notificationId/read")
  @ApiOkResponse({ description: "Owned notification marked read" })
  @ApiNotFoundResponse({
    description: "Notification not found or inaccessible",
  })
  markRead(
    @Param("notificationId", ParseUUIDPipe) notificationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notifications.markRead(notificationId, user);
  }
}
