import {
  NotificationContractError,
  parseNotificationCommand,
} from "./notification-contract-validator";

const validCommand = {
  kind: "notification.command",
  commandId: "11111111-1111-4111-8111-111111111111",
  producer: "booking-service",
  recipient: { userId: "22222222-2222-4222-8222-222222222222" },
  channels: ["IN_APP", "PUSH"],
  template: {
    key: "booking.confirmed.v1",
    version: 1,
    variables: { resourceName: "Robotics Lab", pointCost: 20 },
  },
  correlationId: "33333333-3333-4333-8333-333333333333",
  occurredAt: "2026-08-31T12:00:00.000Z",
};

describe("notification command contract", () => {
  it("accepts an approved versioned command", () => {
    expect(parseNotificationCommand(validCommand)).toEqual(validCommand);
  });

  it("rejects arbitrary templates", () => {
    expect(() =>
      parseNotificationCommand({
        ...validCommand,
        template: { ...validCommand.template, key: "arbitrary.html" },
      }),
    ).toThrow(NotificationContractError);
  });

  it("requires an addressable recipient", () => {
    expect(() =>
      parseNotificationCommand({ ...validCommand, recipient: {} }),
    ).toThrow("recipient requires a ResourceHive userId");
  });

  it("accepts a general in-app and push message from an internal service", () => {
    const message = {
      ...validCommand,
      producer: "resource-service",
      template: {
        key: "notification.message.v1",
        version: 1,
        variables: { title: "Resource updated", message: "Lab hours changed." },
      },
    };

    expect(parseNotificationCommand(message)).toEqual(message);
  });

  it("requires bounded title and message variables for general messages", () => {
    expect(() =>
      parseNotificationCommand({
        ...validCommand,
        producer: "resource-service",
        template: {
          key: "notification.message.v1",
          version: 1,
          variables: { title: "Resource updated" },
        },
      }),
    ).toThrow("template.variables.message is invalid");
  });

  it("prevents services from using another service's templates", () => {
    expect(() =>
      parseNotificationCommand({
        ...validCommand,
        producer: "resource-service",
      }),
    ).toThrow("Booking templates may only be requested by Booking Service");
  });

  it("rejects email for non-verification notifications", () => {
    expect(() =>
      parseNotificationCommand({
        ...validCommand,
        channels: ["EMAIL"],
      }),
    ).toThrow("Email is reserved for Identity Service verification commands");
  });

  it("accepts verification email as the only email use case", () => {
    const verification = {
      ...validCommand,
      producer: "identity-service",
      channels: ["EMAIL"],
      template: {
        key: "identity.verify-email.v1",
        version: 1,
        variables: { verificationUrl: "https://app.example/verify?token=x" },
      },
    };

    expect(parseNotificationCommand(verification)).toEqual(verification);
  });

  it("accepts the development push template without email", () => {
    const testPush = {
      ...validCommand,
      producer: "notification-service",
      channels: ["IN_APP", "PUSH"],
      template: {
        key: "development.test-push.v1",
        version: 1,
        variables: {},
      },
    };

    expect(parseNotificationCommand(testPush)).toEqual(testPush);
  });

  it("rejects the development push template in production", () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      expect(() =>
        parseNotificationCommand({
          ...validCommand,
          producer: "notification-service",
          template: {
            key: "development.test-push.v1",
            version: 1,
            variables: {},
          },
        }),
      ).toThrow("Development test pushes are unavailable in production");
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }
  });
});
