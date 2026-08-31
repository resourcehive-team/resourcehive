import { Controller } from "@nestjs/common";
import {
  Ctx,
  EventPattern,
  KafkaContext,
  Payload,
} from "@nestjs/microservices";
import { NOTIFICATION_TOPICS } from "../contracts";
import { NotificationCommandService } from "./notification-command.service";

@Controller()
export class NotificationEventController {
  constructor(private readonly commands: NotificationCommandService) {}

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
    await this.commands.process(payload);
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
