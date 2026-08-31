import { Module } from "@nestjs/common";
import { KafkaProducerService } from "./kafka-producer.service";
import { OutboxPublisherService } from "./outbox-publisher.service";
import { OutboxRepository } from "./outbox.repository";

@Module({
  providers: [KafkaProducerService, OutboxRepository, OutboxPublisherService],
  exports: [KafkaProducerService, OutboxRepository],
})
export class KafkaModule {}
