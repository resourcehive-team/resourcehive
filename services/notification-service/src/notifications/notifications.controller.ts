import {
  Body,
  Controller,
  Delete,
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
  ApiCookieAuth,
  ApiCreatedResponse,
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
import { RegisterWebPushDto } from "./dto/register-web-push.dto";
import { DevelopmentPushService } from "./development-push.service";
import { NotificationReadService } from "./notification-read.service";
import {
  NotificationResponseDto,
  QueuedPushResponseDto,
  RemovedResponseDto,
  UpdatedCountResponseDto,
  WebPushSubscriptionResponseDto,
} from "../docs/notification-responses.dto";

@ApiTags("notifications")
@ApiBearerAuth()
@ApiCookieAuth("resourcehive_access_token")
@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationReadService,
    private readonly developmentPush: DevelopmentPushService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List notifications for the current user" })
  @ApiOkResponse({
    description: "Authenticated user's notifications",
    type: [NotificationResponseDto],
  })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListNotificationsDto,
  ) {
    return this.notifications.list(user, query);
  }

  @Patch("read-all")
  @ApiOperation({ summary: "Mark all unread notifications as read" })
  @ApiOkResponse({
    description: "All unread notifications marked read",
    type: UpdatedCountResponseDto,
  })
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.markAllRead(user);
  }

  @Post("test-push")
  @ApiOperation({
    summary: "Queue a push to the authenticated user's browsers (local only)",
  })
  @ApiCreatedResponse({
    description: "Development push queued",
    type: QueuedPushResponseDto,
  })
  @ApiNotFoundResponse({ description: "Unavailable in production" })
  sendTestPush(@CurrentUser() user: AuthenticatedUser) {
    return this.developmentPush.queue(user.userId);
  }

  @Post("push-subscriptions")
  @ApiOperation({ summary: "Register a browser push subscription" })
  @ApiCreatedResponse({
    description: "Browser push subscription registered",
    type: WebPushSubscriptionResponseDto,
  })
  registerWebPush(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: RegisterWebPushDto,
  ) {
    return this.notifications.registerWebPush(user, input);
  }

  @Get("push-subscriptions")
  @ApiOperation({ summary: "List active browser push subscriptions" })
  @ApiOkResponse({
    description: "Active browser push subscriptions",
    type: [WebPushSubscriptionResponseDto],
  })
  listWebPush(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.listWebPush(user);
  }

  @Delete("push-subscriptions/:subscriptionId")
  @ApiOperation({ summary: "Deactivate a browser push subscription" })
  @ApiOkResponse({
    description: "Browser push subscription deactivated",
    type: RemovedResponseDto,
  })
  removeWebPush(
    @Param("subscriptionId", ParseUUIDPipe) subscriptionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notifications.removeWebPush(subscriptionId, user);
  }

  @Get(":notificationId")
  @ApiOperation({ summary: "Get an owned notification" })
  @ApiOkResponse({
    description: "Owned notification",
    type: NotificationResponseDto,
  })
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
  @ApiOperation({ summary: "Mark an owned notification as read" })
  @ApiOkResponse({
    description: "Owned notification marked read",
    type: NotificationResponseDto,
  })
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
