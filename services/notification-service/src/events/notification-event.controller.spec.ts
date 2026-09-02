import { Logger, UnauthorizedException } from "@nestjs/common";
import { KafkaContext } from "@nestjs/microservices";
import {
  NOTIFICATION_TOPICS,
  NotificationContractError,
} from "@resourcehive/notification-client";
import { BookingEventService } from "./booking-event.service";
import { NotificationCommandService } from "./notification-command.service";
import { NotificationEventController } from "./notification-event.controller";

interface SentRecord {
  topic: string;
  messages: Array<{ key: Buffer | null; value: string }>;
}

describe("NotificationEventController", () => {
  const processCommand = jest.fn();
  const processBooking = jest.fn();
  const commitOffsets = jest.fn();
  let lastSentRecord: SentRecord | undefined;
  const send = jest.fn((record: SentRecord): Promise<void> => {
    lastSentRecord = record;
    return Promise.resolve();
  });
  const context = {
    getMessage: () => ({ offset: "41", key: Buffer.from("user-id") }),
    getTopic: () => NOTIFICATION_TOPICS.commands,
    getPartition: () => 2,
    getConsumer: () => ({ commitOffsets }),
    getProducer: () => ({ send }),
  } as unknown as KafkaContext;
  const controller = new NotificationEventController(
    { process: processCommand } as unknown as NotificationCommandService,
    { handle: processBooking } as unknown as BookingEventService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    lastSentRecord = undefined;
    jest.spyOn(Logger.prototype, "warn").mockImplementation();
  });

  function rejectionRecord(): Record<string, unknown> {
    const value = lastSentRecord?.messages[0]?.value;
    if (!value) throw new Error("Expected a dead-letter record");
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Expected a dead-letter object");
    }
    return parsed as Record<string, unknown>;
  }

  it("commits the next offset after a command is stored", async () => {
    processCommand.mockResolvedValue({ duplicate: false });

    await controller.handleCommand({ commandId: "command-id" }, context);

    expect(processCommand).toHaveBeenCalledWith({ commandId: "command-id" });
    expect(commitOffsets).toHaveBeenCalledWith([
      {
        topic: NOTIFICATION_TOPICS.commands,
        partition: 2,
        offset: "42",
      },
    ]);
    expect(send).not.toHaveBeenCalled();
  });

  it("commits duplicate commands after idempotent processing", async () => {
    processCommand.mockResolvedValue({ duplicate: true });

    await controller.handleIdentityCommand(
      { commandId: "duplicate-id" },
      context,
    );

    expect(commitOffsets).toHaveBeenCalledTimes(1);
  });

  it("publishes invalid commands to the dead-letter topic before committing", async () => {
    processCommand.mockRejectedValue(
      new NotificationContractError("INVALID_CONTRACT", "channels is invalid"),
    );

    await controller.handleCommand({ commandId: "bad-command" }, context);

    expect(lastSentRecord?.topic).toBe(NOTIFICATION_TOPICS.deadLetters);
    expect(lastSentRecord?.messages[0]?.key).toEqual(Buffer.from("user-id"));
    expect(typeof lastSentRecord?.messages[0]?.value).toBe("string");
    const record = rejectionRecord();
    expect(record).toEqual(
      expect.objectContaining({
        kind: "notification.rejected",
        sourceTopic: NOTIFICATION_TOPICS.commands,
        sourcePartition: 2,
        sourceOffset: "41",
        messageId: "bad-command",
        errorCode: "INVALID_CONTRACT",
      }),
    );
    expect(record).not.toHaveProperty("payload");
    expect(commitOffsets).toHaveBeenCalledTimes(1);
    expect(send.mock.invocationCallOrder[0]).toBeLessThan(
      commitOffsets.mock.invocationCallOrder[0],
    );
  });

  it("dead-letters permanently rejected recipients", async () => {
    processCommand.mockRejectedValue(
      new UnauthorizedException("An active recipient is required"),
    );

    await controller.handleCommand({ commandId: "inactive-user" }, context);

    const record = rejectionRecord();
    expect(record.errorCode).toBe("RECIPIENT_REJECTED");
    expect(commitOffsets).toHaveBeenCalledTimes(1);
  });

  it("does not commit transient failures so Kafka can redeliver them", async () => {
    processCommand.mockRejectedValue(new Error("database unavailable"));

    await expect(
      controller.handleCommand({ commandId: "retry-command" }, context),
    ).rejects.toThrow("database unavailable");
    expect(send).not.toHaveBeenCalled();
    expect(commitOffsets).not.toHaveBeenCalled();
  });

  it("applies the same rejection handling to booking events", async () => {
    processBooking.mockRejectedValue(
      new NotificationContractError(
        "INVALID_BOOKING_EVENT",
        "Invalid booking event payload",
      ),
    );

    await controller.handleBookingEvent({ eventId: "bad-event" }, context);

    const record = rejectionRecord();
    expect(record).toEqual(
      expect.objectContaining({
        messageId: "bad-event",
        errorCode: "INVALID_BOOKING_EVENT",
      }),
    );
    expect(commitOffsets).toHaveBeenCalledTimes(1);
  });
});
