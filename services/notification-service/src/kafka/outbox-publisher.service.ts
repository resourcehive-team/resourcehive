import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { KafkaProducerService } from "./kafka-producer.service";
import { getNotificationKafkaConfig } from "./kafka.config";
import { OutboxRepository } from "./outbox.repository";

@Injectable()
export class OutboxPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisherService.name);
  private timer?: NodeJS.Timeout;
  private publishing = false;

  constructor(
    private readonly outbox: OutboxRepository,
    private readonly kafka: KafkaProducerService,
  ) {}

  onModuleInit(): void {
    if (!getNotificationKafkaConfig().enabled) return;
    const interval = Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 1_000);
    this.timer = setInterval(() => void this.publishDue(), interval);
    this.timer.unref();
  }

  async publishDue(): Promise<void> {
    if (this.publishing) return;
    this.publishing = true;
    try {
      const events = await this.outbox.claimDue(25);
      for (const event of events) {
        try {
          await this.kafka.send({
            topic: event.topic,
            key: event.partitionKey,
            value: {
              eventId: event.id,
              eventType: event.eventType,
              eventVersion: event.eventVersion,
              producer: event.producer,
              correlationId: event.correlationId,
              occurredAt: event.occurredAt.toISOString(),
              payload: event.payload,
            },
          });
          await this.outbox.markPublished(event.id);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown error";
          await this.outbox.markFailed(event.id, message);
          this.logger.error(`Unable to publish outbox event ${event.id}`);
        }
      }
    } finally {
      this.publishing = false;
    }
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
