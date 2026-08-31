export const NOTIFICATION_TOPICS = {
  commands: "resourcehive.notification.commands.v1",
  identityCommands: "resourcehive.identity.notification-commands.v1",
  bookingEvents: "resourcehive.booking.events.v1",
  deliveryJobs: "resourcehive.notification.delivery-jobs.v1",
  deadLetter: "resourcehive.notification.dlq.v1",
} as const;

export const NOTIFICATION_TEMPLATES = {
  identityVerifyEmail: "identity.verify-email.v1",
  identityPasswordReset: "identity.password-reset.v1",
  identityPasswordChanged: "identity.password-changed.v1",
  bookingConfirmed: "booking.confirmed.v1",
  bookingCancelled: "booking.cancelled.v1",
  bookingCompleted: "booking.completed.v1",
} as const;

export type NotificationTemplateKey =
  (typeof NOTIFICATION_TEMPLATES)[keyof typeof NOTIFICATION_TEMPLATES];

export type NotificationChannel = "IN_APP" | "EMAIL" | "PUSH";
export type NotificationProducer =
  | "identity-service"
  | "booking-service"
  | "resource-service"
  | "notification-service";

export type TemplateValue = string | number | boolean;
export type TemplateVariables = Record<string, TemplateValue>;

export interface NotificationRecipient {
  userId?: string;
  email?: string;
}

export interface NotificationCommandV1 {
  kind: "notification.command";
  commandId: string;
  idempotencyKey: string;
  producer: NotificationProducer;
  recipient: NotificationRecipient;
  channels: NotificationChannel[];
  template: {
    key: NotificationTemplateKey;
    version: 1;
    variables: TemplateVariables;
  };
  correlationId: string;
  occurredAt: string;
}

export interface DeliveryJobV1 {
  kind: "notification.delivery-job";
  deliveryId: string;
  occurredAt: string;
}

export interface DeadLetterMessageV1 {
  kind: "notification.dead-letter";
  sourceTopic: string;
  sourcePartition: number;
  sourceOffset: string;
  errorCode: string;
  errorMessage: string;
  failedAt: string;
}
