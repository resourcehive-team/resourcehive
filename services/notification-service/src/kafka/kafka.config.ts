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

  if ((username && !password) || (!username && password)) {
    throw new Error(
      "KAFKA_SASL_USERNAME and KAFKA_SASL_PASSWORD must be configured together",
    );
  }

  return {
    enabled: process.env.KAFKA_ENABLED === "true",
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
