import { getNotificationKafkaConfig } from "./kafka.config";

describe("notification Kafka configuration", () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    process.env = { ...originalEnvironment };
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it("keeps Kafka disabled unless explicitly enabled", () => {
    delete process.env.KAFKA_ENABLED;
    expect(getNotificationKafkaConfig().enabled).toBe(false);
  });

  it("parses multiple broker addresses", () => {
    process.env.KAFKA_ENABLED = "true";
    process.env.KAFKA_BROKERS = "kafka-a:9092, kafka-b:9092";
    const config = getNotificationKafkaConfig();
    expect(config.enabled).toBe(true);
    expect(config.options.options?.client?.brokers).toEqual([
      "kafka-a:9092",
      "kafka-b:9092",
    ]);
  });

  it("rejects partial SASL configuration", () => {
    process.env.KAFKA_SASL_USERNAME = "notification";
    delete process.env.KAFKA_SASL_PASSWORD;
    expect(() => getNotificationKafkaConfig()).toThrow(
      "must be configured together",
    );
  });

  it("requires a broker when Kafka is enabled", () => {
    process.env.KAFKA_ENABLED = "true";
    process.env.KAFKA_BROKERS = " , ";
    expect(() => getNotificationKafkaConfig()).toThrow(
      "KAFKA_BROKERS must contain at least one broker",
    );
  });

  it("requires TLS when SASL credentials are configured", () => {
    process.env.KAFKA_SASL_USERNAME = "notification";
    process.env.KAFKA_SASL_PASSWORD = "secret";
    process.env.KAFKA_SSL = "false";
    expect(() => getNotificationKafkaConfig()).toThrow(
      "KAFKA_SSL must be true when SASL credentials are used",
    );
  });
});
