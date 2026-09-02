import { isEmail, isISO8601, isUUID } from "class-validator";
import {
  NOTIFICATION_TEMPLATES,
  NotificationChannel,
  NotificationCommandV1,
  NotificationProducer,
  NotificationTemplateKey,
  TemplateValue,
} from "./contracts";

const channels = new Set<NotificationChannel>(["IN_APP", "EMAIL", "PUSH"]);
const producers = new Set<NotificationProducer>([
  "identity-service",
  "booking-service",
  "resource-service",
  "notification-service",
]);
const templates = new Set<NotificationTemplateKey>(
  Object.values(NOTIFICATION_TEMPLATES),
);

export class NotificationContractError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "NotificationContractError";
  }
}

export function parseNotificationCommand(
  input: unknown,
): NotificationCommandV1 {
  const value = requireObject(input, "command");
  if (value.kind !== "notification.command") invalid("kind");
  requireUuid(value.commandId, "commandId");
  if (!producers.has(value.producer as NotificationProducer)) {
    invalid("producer");
  }
  requireUuid(value.correlationId, "correlationId");
  if (typeof value.occurredAt !== "string" || !isISO8601(value.occurredAt)) {
    invalid("occurredAt");
  }

  const recipient = requireObject(value.recipient, "recipient");
  if (recipient.userId !== undefined) requireUuid(recipient.userId, "userId");
  if (
    recipient.email !== undefined &&
    (typeof recipient.email !== "string" || !isEmail(recipient.email))
  ) {
    invalid("email");
  }
  if (!recipient.userId) {
    throw new NotificationContractError(
      "RECIPIENT_REQUIRED",
      "recipient requires a ResourceHive userId",
    );
  }

  if (!Array.isArray(value.channels) || value.channels.length === 0) {
    invalid("channels");
  }
  for (const channel of value.channels) {
    if (!channels.has(channel as NotificationChannel)) invalid("channels");
  }
  if (new Set(value.channels).size !== value.channels.length) {
    invalid("channels");
  }

  const template = requireObject(value.template, "template");
  if (!templates.has(template.key as NotificationTemplateKey)) {
    throw new NotificationContractError(
      "UNKNOWN_TEMPLATE",
      "template key is not approved",
    );
  }
  if (
    template.key === NOTIFICATION_TEMPLATES.developmentTestPush &&
    process.env.NODE_ENV === "production"
  ) {
    throw new NotificationContractError(
      "TEMPLATE_FORBIDDEN",
      "Development test pushes are unavailable in production",
    );
  }
  if (
    String(template.key).startsWith("identity.") &&
    value.producer !== "identity-service"
  ) {
    throw new NotificationContractError(
      "TEMPLATE_FORBIDDEN",
      "Identity templates may only be requested by Identity Service",
    );
  }
  if (
    String(template.key).startsWith("booking.") &&
    value.producer !== "booking-service"
  ) {
    throw new NotificationContractError(
      "TEMPLATE_FORBIDDEN",
      "Booking templates may only be requested by Booking Service",
    );
  }
  if (
    template.key === NOTIFICATION_TEMPLATES.developmentTestPush &&
    value.producer !== "notification-service"
  ) {
    throw new NotificationContractError(
      "TEMPLATE_FORBIDDEN",
      "Development test pushes may only be requested by Notification Service",
    );
  }
  const usesEmail = value.channels.includes("EMAIL");
  const isVerification =
    template.key === NOTIFICATION_TEMPLATES.identityVerifyEmail;
  if (usesEmail && !isVerification) {
    throw new NotificationContractError(
      "CHANNEL_FORBIDDEN",
      "Email is reserved for Identity Service verification commands",
    );
  }
  if (
    isVerification &&
    (value.producer !== "identity-service" ||
      value.channels.length !== 1 ||
      value.channels[0] !== "EMAIL")
  ) {
    throw new NotificationContractError(
      "CHANNEL_FORBIDDEN",
      "Email verification commands must use only the EMAIL channel",
    );
  }
  if (template.version !== 1) {
    throw new NotificationContractError(
      "UNSUPPORTED_VERSION",
      "template version is not supported",
    );
  }
  const variables = requireObject(template.variables, "template.variables");
  for (const variable of Object.values(variables)) {
    if (!isTemplateValue(variable)) invalid("template.variables");
  }
  validateTemplateVariables(template.key as NotificationTemplateKey, variables);

  return value as unknown as NotificationCommandV1;
}

function validateTemplateVariables(
  key: NotificationTemplateKey,
  variables: Record<string, unknown>,
): void {
  if (key === NOTIFICATION_TEMPLATES.identityVerifyEmail) {
    requireText(
      variables.verificationUrl,
      "template.variables.verificationUrl",
      2_000,
    );
  }
  if (String(key).startsWith("booking.")) {
    requireText(variables.resourceName, "template.variables.resourceName", 200);
  }
  if (key === NOTIFICATION_TEMPLATES.message) {
    requireText(variables.title, "template.variables.title", 120);
    requireText(variables.message, "template.variables.message", 500);
  }
}

function requireObject(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    invalid(field);
  }
  return value as Record<string, unknown>;
}

function requireUuid(value: unknown, field: string): void {
  if (typeof value !== "string" || !isUUID(value)) invalid(field);
}

function requireText(value: unknown, field: string, max: number): void {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    invalid(field);
  }
}

function isTemplateValue(value: unknown): value is TemplateValue {
  return ["string", "number", "boolean"].includes(typeof value);
}

function invalid(field: string): never {
  throw new NotificationContractError(
    "INVALID_CONTRACT",
    `${field} is invalid`,
  );
}
