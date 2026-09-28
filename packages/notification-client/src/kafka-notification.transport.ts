import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Kafka, Producer } from "kafkajs";
import { NOTIFICATION_CLIENT_OPTIONS } from "./notification-client.options";
import type { NotificationKafkaOptions } from "./notification-client.options";

@Injectable()
export class KafkaNotificationTransport
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(KafkaNotificationTransport.name);
  private readonly producer?: Producer;

  constructor(
    @Inject(NOTIFICATION_CLIENT_OPTIONS)
    private readonly options: NotificationKafkaOptions,
  ) {
    if (!options.enabled) return;
    const kafka = new Kafka({
      clientId: options.clientId,
      brokers: options.brokers,
      ssl: options.ssl,
      ...(options.username && options.password
        ? {
            sasl: {
              mechanism: "plain" as const,
              username: options.username,
              password: options.password,
            },
          }
        : {}),
    });
    this.producer = kafka.producer({ allowAutoTopicCreation: false });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.producer?.connect();
    } catch (error) {
      this.logger.error(
        "Kafka producer failed to connect at startup; will retry lazily on first publish",
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.producer?.disconnect();
  }

  async publish(topic: string, key: string, value: unknown): Promise<void> {
    if (!this.producer) {
      throw new Error(
        "Notification publishing is disabled; set KAFKA_ENABLED=true",
      );
    }
    await this.producer.connect();
    await this.producer.send({
      topic,
      messages: [{ key, value: JSON.stringify(value) }],
    });
  }
}
