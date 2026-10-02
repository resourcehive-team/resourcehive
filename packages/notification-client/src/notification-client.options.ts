import { NotificationProducer } from "./contracts";

export const NOTIFICATION_CLIENT_OPTIONS = Symbol(
  "NOTIFICATION_CLIENT_OPTIONS",
);

export interface NotificationClientOptions {
  producer: NotificationProducer;
  clientId?: string;
}

export interface NotificationKafkaOptions extends NotificationClientOptions {
  enabled: boolean;
  brokers: string[];
  clientId: string;
  ssl: boolean;
  username?: string;
  password?: string;
}

export function getNotificationKafkaOptions(
  options: NotificationClientOptions,
): NotificationKafkaOptions {
  const enabled = process.env.KAFKA_ENABLED === "true";
  const brokers = (process.env.KAFKA_BROKERS ?? "localhost:9092")
    .split(",")
    .map((broker) => broker.trim())
    .filter(Boolean);
  const ssl = process.env.KAFKA_SSL === "true";
  const username = process.env.KAFKA_SASL_USERNAME;
  const password = process.env.KAFKA_SASL_PASSWORD;

  if (enabled && brokers.length === 0) {
    throw new Error("KAFKA_BROKERS must contain at least one broker");
  }
  if ((username && !password) || (!username && password)) {
    throw new Error(
      "KAFKA_SASL_USERNAME and KAFKA_SASL_PASSWORD must be configured together",
    );
  }
  if (username && password && !ssl) {
    throw new Error("KAFKA_SSL must be true when SASL credentials are used");
  }

  return {
    ...options,
    enabled,
    brokers,
    clientId: options.clientId ?? `${options.producer}-notification-producer`,
    ssl,
    username,
    password,
  };
}
