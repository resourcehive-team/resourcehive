import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import {
  BookingEventType,
  BookingEventV1,
  parseBookingEvent,
} from "./booking-event";
import {
  NOTIFICATION_TEMPLATES,
  NOTIFICATION_TOPICS,
  NotificationCommandV1,
} from "./contracts";
import { parseNotificationCommand } from "./contract-validator";
import { KafkaNotificationTransport } from "./kafka-notification.transport";
import {
  NOTIFICATION_CLIENT_OPTIONS,
  NotificationKafkaOptions,
} from "./notification-client.options";

export interface SendNotificationInput {
  commandId?: string;
  recipientUserId: string;
  title: string;
  message: string;
  channels?: Array<"IN_APP" | "PUSH">;
  correlationId?: string;
}

export interface SendVerificationEmailInput {
  commandId?: string;
  recipientUserId: string;
  email: string;
  verificationUrl: string;
  correlationId?: string;
}

export interface PublishBookingEventInput {
  eventId?: string;
  eventType: BookingEventType;
  bookingId: string;
  userId: string;
  email?: string;
  resourceName: string;
  refundPoints?: number;
  correlationId?: string;
}

@Injectable()
export class NotificationClientService {
  constructor(
    @Inject(NOTIFICATION_CLIENT_OPTIONS)
    private readonly options: NotificationKafkaOptions,
    private readonly transport: KafkaNotificationTransport,
  ) {}

  async send(input: SendNotificationInput): Promise<NotificationCommandV1> {
    const commandId = input.commandId ?? randomUUID();
    const command = parseNotificationCommand({
      kind: "notification.command",
      commandId,
      producer: this.options.producer,
      recipient: { userId: input.recipientUserId },
      channels: input.channels ?? ["IN_APP", "PUSH"],
      template: {
        key: NOTIFICATION_TEMPLATES.message,
        version: 1,
        variables: { title: input.title, message: input.message },
      },
      correlationId: input.correlationId ?? commandId,
      occurredAt: new Date().toISOString(),
    });
    await this.transport.publish(
      NOTIFICATION_TOPICS.commands,
      input.recipientUserId,
      command,
    );
    return command;
  }

  async sendVerificationEmail(
    input: SendVerificationEmailInput,
  ): Promise<NotificationCommandV1> {
    if (this.options.producer !== "identity-service") {
      throw new Error(
        "Only Identity Service may publish verification email commands",
      );
    }
    const commandId = input.commandId ?? randomUUID();
    const command = parseNotificationCommand({
      kind: "notification.command",
      commandId,
      producer: this.options.producer,
      recipient: {
        userId: input.recipientUserId,
        email: input.email,
      },
      channels: ["EMAIL"],
      template: {
        key: NOTIFICATION_TEMPLATES.identityVerifyEmail,
        version: 1,
        variables: { verificationUrl: input.verificationUrl },
      },
      correlationId: input.correlationId ?? commandId,
      occurredAt: new Date().toISOString(),
    });
    await this.transport.publish(
      NOTIFICATION_TOPICS.identityCommands,
      input.recipientUserId,
      command,
    );
    return command;
  }

  async publishBookingEvent(
    input: PublishBookingEventInput,
  ): Promise<BookingEventV1> {
    if (this.options.producer !== "booking-service") {
      throw new Error("Only Booking Service may publish booking events");
    }
    const event = parseBookingEvent({
      kind: "booking.event",
      eventId: input.eventId ?? randomUUID(),
      eventType: input.eventType,
      eventVersion: 1,
      producer: "booking-service",
      correlationId: input.correlationId ?? input.bookingId,
      occurredAt: new Date().toISOString(),
      payload: {
        bookingId: input.bookingId,
        userId: input.userId,
        ...(input.email ? { email: input.email } : {}),
        resourceName: input.resourceName,
        ...(input.refundPoints === undefined
          ? {}
          : { refundPoints: input.refundPoints }),
      },
    });
    await this.transport.publish(
      NOTIFICATION_TOPICS.bookingEvents,
      input.bookingId,
      event,
    );
    return event;
  }
}
