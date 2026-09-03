import { getNotificationKafkaOptions } from "./notification-client.options";

describe("notification producer configuration", () => {
  const originalEnvironment = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnvironment };
  });

  it("uses the registering service as the default client ID", () => {
    process.env.KAFKA_ENABLED = "true";
    process.env.KAFKA_BROKERS = "broker-1:9092,broker-2:9092";
    const options = getNotificationKafkaOptions({
      producer: "booking-service",
    });
    expect(options.clientId).toBe("booking-service-notification-producer");
    expect(options.brokers).toEqual(["broker-1:9092", "broker-2:9092"]);
  });

  it("requires complete TLS-protected SASL configuration", () => {
    process.env.KAFKA_SASL_USERNAME = "user";
    delete process.env.KAFKA_SASL_PASSWORD;
    expect(() =>
      getNotificationKafkaOptions({ producer: "resource-service" }),
    ).toThrow("configured together");

    process.env.KAFKA_SASL_PASSWORD = "password";
    process.env.KAFKA_SSL = "false";
    expect(() =>
      getNotificationKafkaOptions({ producer: "resource-service" }),
    ).toThrow("KAFKA_SSL must be true");
  });
});
