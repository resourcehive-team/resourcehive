import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Kafka, Producer } from "kafkajs";
import { getNotificationKafkaConfig } from "./kafka.config";

export interface KafkaEventMessage {
  topic: string;
  key: string;
  value: unknown;
}

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private readonly config = getNotificationKafkaConfig();
  private producer?: Producer;

  async onModuleInit(): Promise<void> {
    if (!this.config.enabled) return;
    const client = this.config.options.options?.client;
    if (!client) throw new Error("Kafka client configuration is missing");
    this.producer = new Kafka(client).producer({
      allowAutoTopicCreation: false,
    });
    await this.producer.connect();
    this.logger.log("Kafka producer connected");
  }

  async send(message: KafkaEventMessage): Promise<void> {
    if (!this.producer) {
      throw new Error("Kafka producer is not enabled or connected");
    }
    await this.producer.send({
      topic: message.topic,
      messages: [{ key: message.key, value: JSON.stringify(message.value) }],
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.producer) await this.producer.disconnect();
  }
}
