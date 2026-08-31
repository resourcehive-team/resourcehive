import { KafkaProducerService } from "./kafka-producer.service";
import { OutboxPublisherService } from "./outbox-publisher.service";
import { OutboxRepository } from "./outbox.repository";

describe("OutboxPublisherService", () => {
  const event = {
    id: "11111111-1111-4111-8111-111111111111",
    topic: "topic.v1",
    partitionKey: "user-id",
    eventType: "notification.requested",
    eventVersion: 1,
    producer: "notification-service",
    correlationId: "22222222-2222-4222-8222-222222222222",
    payload: { message: "hello" },
    occurredAt: new Date("2026-08-31T12:00:00.000Z"),
    attemptCount: 1,
  };
  const claimDue = jest.fn();
  const markPublished = jest.fn();
  const markFailed = jest.fn();
  const send = jest.fn();
  const outbox = {
    claimDue,
    markPublished,
    markFailed,
  } as unknown as OutboxRepository;
  const kafka = { send } as unknown as KafkaProducerService;
  const service = new OutboxPublisherService(outbox, kafka);

  beforeEach(() => jest.clearAllMocks());

  it("marks an event published only after Kafka accepts it", async () => {
    claimDue.mockResolvedValue([event]);
    send.mockResolvedValue(undefined);
    await service.publishDue();
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ topic: "topic.v1", key: "user-id" }),
    );
    expect(markPublished).toHaveBeenCalledWith(event.id);
  });

  it("records a broker failure without marking the event published", async () => {
    claimDue.mockResolvedValue([event]);
    send.mockRejectedValue(new Error("broker unavailable"));
    await service.publishDue();
    expect(markFailed).toHaveBeenCalledWith(event.id, "broker unavailable");
    expect(markPublished).not.toHaveBeenCalled();
  });
});
