import { Injectable } from "@nestjs/common";
import { Prisma, PrismaService } from "@resourcehive/database";

export interface EnqueueOutboxEventInput {
  id?: string;
  topic: string;
  partitionKey: string;
  eventType: string;
  eventVersion?: number;
  producer: string;
  correlationId: string;
  payload: Prisma.InputJsonValue;
  occurredAt: Date;
}

export interface ClaimedOutboxEvent {
  id: string;
  topic: string;
  partitionKey: string;
  eventType: string;
  eventVersion: number;
  producer: string;
  correlationId: string;
  payload: Prisma.JsonValue;
  occurredAt: Date;
  attemptCount: number;
}

type OutboxClient = Pick<Prisma.TransactionClient, "outboxEvent">;

@Injectable()
export class OutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  enqueue(input: EnqueueOutboxEventInput, client: OutboxClient = this.prisma) {
    return client.outboxEvent.create({
      data: {
        ...(input.id ? { id: input.id } : {}),
        topic: input.topic,
        partitionKey: input.partitionKey,
        eventType: input.eventType,
        eventVersion: input.eventVersion ?? 1,
        producer: input.producer,
        correlationId: input.correlationId,
        payload: input.payload,
        occurredAt: input.occurredAt,
      },
    });
  }

  claimDue(limit: number): Promise<ClaimedOutboxEvent[]> {
    return this.prisma.$queryRaw<ClaimedOutboxEvent[]>(Prisma.sql`
      WITH due AS (
        SELECT id
        FROM outbox_events
        WHERE published_at IS NULL
          AND (next_attempt_at IS NULL OR next_attempt_at <= CURRENT_TIMESTAMP)
        ORDER BY created_at
        FOR UPDATE SKIP LOCKED
        LIMIT ${limit}
      )
      UPDATE outbox_events AS event
      SET attempt_count = event.attempt_count + 1,
          next_attempt_at = CURRENT_TIMESTAMP + INTERVAL '1 minute'
      FROM due
      WHERE event.id = due.id
      RETURNING
        event.id,
        event.topic,
        event.partition_key AS "partitionKey",
        event.event_type AS "eventType",
        event.event_version AS "eventVersion",
        event.producer,
        event.correlation_id AS "correlationId",
        event.payload,
        event.occurred_at AS "occurredAt",
        event.attempt_count AS "attemptCount"
    `);
  }

  async markPublished(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: { publishedAt: new Date(), nextAttemptAt: null, lastError: null },
    });
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: { lastError: error.slice(0, 1_000) },
    });
  }
}
