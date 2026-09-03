import { KafkaOptions, Transport } from "@nestjs/microservices";

export interface NotificationKafkaConfig {
  enabled: boolean;
  options: KafkaOptions;
}

export function getNotificationKafkaConfig(): NotificationKafkaConfig {
  const brokers = (process.env.KAFKA_BROKERS ?? "localhost:9092")
    .split(",")
    .map((broker) => broker.trim())
    .filter(Boolean);
  const ssl = process.env.KAFKA_SSL === "true";
  const username = process.env.KAFKA_SASL_USERNAME;
  const password = process.env.KAFKA_SASL_PASSWORD;
  const enabled = process.env.KAFKA_ENABLED === "true";

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
    enabled,
    options: {
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: process.env.KAFKA_CLIENT_ID ?? "notification-service",
          brokers,
          ssl,
          ...(username && password
            ? {
                sasl: {
                  mechanism: "plain" as const,
                  username,
                  password,
                },
              }
            : {}),
        },
        consumer: {
          groupId:
            process.env.KAFKA_CONSUMER_GROUP ?? "notification-service-v1",
        },
        run: { autoCommit: false },
      },
    },
  };
}
