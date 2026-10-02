import { Controller, Logger, UnauthorizedException } from "@nestjs/common";
import {
  Ctx,
  EventPattern,
  KafkaContext,
  Payload,
} from "@nestjs/microservices";
import {
  NOTIFICATION_TOPICS,
  NotificationContractError,
} from "@resourcehive/notification-client";
import { BookingEventService } from "./booking-event.service";
import { NotificationCommandService } from "./notification-command.service";

@Controller()
export class NotificationEventController {
  private readonly logger = new Logger(NotificationEventController.name);

  constructor(
    private readonly commands: NotificationCommandService,
    private readonly bookings: BookingEventService,
  ) {}

  @EventPattern(NOTIFICATION_TOPICS.bookingEvents)
  async handleBookingEvent(
    @Payload() payload: unknown,
    @Ctx() context: KafkaContext,
  ) {
    await this.processMessage(payload, context, () =>
      this.bookings.handle(payload),
    );
  }

  @EventPattern(NOTIFICATION_TOPICS.commands)
  handleCommand(@Payload() payload: unknown, @Ctx() context: KafkaContext) {
    return this.process(payload, context);
  }

  @EventPattern(NOTIFICATION_TOPICS.identityCommands)
  handleIdentityCommand(
    @Payload() payload: unknown,
    @Ctx() context: KafkaContext,
  ) {
    return this.process(payload, context);
  }

  private async process(
    payload: unknown,
    context: KafkaContext,
  ): Promise<void> {
    await this.processMessage(payload, context, () =>
      this.commands.process(payload),
    );
  }

  private async processMessage(
    payload: unknown,
    context: KafkaContext,
    handler: () => Promise<unknown>,
  ): Promise<void> {
    try {
      await handler();
    } catch (error) {
      if (!this.isPermanentRejection(error)) throw error;
      await this.publishRejection(payload, context, error);
    }
    await this.commit(context);
  }

  private isPermanentRejection(
    error: unknown,
  ): error is NotificationContractError | UnauthorizedException {
    return (
      error instanceof NotificationContractError ||
      error instanceof UnauthorizedException
    );
  }

  private async publishRejection(
    payload: unknown,
    context: KafkaContext,
    error: NotificationContractError | UnauthorizedException,
  ): Promise<void> {
    const message = context.getMessage();
    const rejection = {
      kind: "notification.rejected",
      sourceTopic: context.getTopic(),
      sourcePartition: context.getPartition(),
      sourceOffset: message.offset,
      messageId: this.messageId(payload),
      errorCode:
        error instanceof NotificationContractError
          ? error.code
          : "RECIPIENT_REJECTED",
      errorMessage: error.message,
      rejectedAt: new Date().toISOString(),
    };
    await context.getProducer().send({
      topic: NOTIFICATION_TOPICS.deadLetters,
      messages: [{ key: message.key, value: JSON.stringify(rejection) }],
    });
    this.logger.warn(
      `Rejected Kafka message ${rejection.messageId ?? "without an ID"}: ${rejection.errorCode}`,
    );
  }

  private messageId(payload: unknown): string | undefined {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return undefined;
    }
    const value = payload as Record<string, unknown>;
    const id = value.commandId ?? value.eventId;
    return typeof id === "string" ? id : undefined;
  }

  private async commit(context: KafkaContext): Promise<void> {
    const offset = (BigInt(context.getMessage().offset) + 1n).toString();
    await context.getConsumer().commitOffsets([
      {
        topic: context.getTopic(),
        partition: context.getPartition(),
        offset,
      },
    ]);
  }
}
