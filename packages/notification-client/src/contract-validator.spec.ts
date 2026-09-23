import {
  NotificationContractError,
  parseNotificationCommand,
} from "./contract-validator";

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

  it("requires a ResourceHive user recipient", () => {
    expect(() =>
      parseNotificationCommand({ ...validCommand, recipient: {} }),
    ).toThrow("recipient requires a ResourceHive userId");
  });

  it("accepts bounded general messages", () => {
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

  it("rejects email for general notifications", () => {
    expect(() =>
      parseNotificationCommand({ ...validCommand, channels: ["EMAIL"] }),
    ).toThrow("Email is reserved for Identity Service email commands");
  });

  it("accepts Identity Service verification email only", () => {
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

  it("accepts Identity Service password reset email commands", () => {
    const reset = {
      ...validCommand,
      producer: "identity-service",
      channels: ["EMAIL"],
      template: {
        key: "identity.password-reset.v1",
        version: 1,
        variables: { resetUrl: "https://app.example/reset-password?token=x" },
      },
    };
    expect(parseNotificationCommand(reset)).toEqual(reset);
  });

  it("accepts Identity Service password changed email commands", () => {
    const changed = {
      ...validCommand,
      producer: "identity-service",
      channels: ["EMAIL"],
      template: {
        key: "identity.password-changed.v1",
        version: 1,
        variables: {},
      },
    };
    expect(parseNotificationCommand(changed)).toEqual(changed);
  });

  it("rejects password reset commands without a reset URL", () => {
    expect(() =>
      parseNotificationCommand({
        ...validCommand,
        producer: "identity-service",
        channels: ["EMAIL"],
        template: {
          key: "identity.password-reset.v1",
          version: 1,
          variables: {},
        },
      }),
    ).toThrow("template.variables.resetUrl");
  });

  it("rejects password changed commands with variables", () => {
    expect(() =>
      parseNotificationCommand({
        ...validCommand,
        producer: "identity-service",
        channels: ["EMAIL"],
        template: {
          key: "identity.password-changed.v1",
          version: 1,
          variables: { token: "must-not-be-included" },
        },
      }),
    ).toThrow("template.variables is invalid");
  });

  it("rejects identity email commands with additional channels", () => {
    expect(() =>
      parseNotificationCommand({
        ...validCommand,
        producer: "identity-service",
        channels: ["EMAIL", "PUSH"],
        template: {
          key: "identity.password-changed.v1",
          version: 1,
          variables: {},
        },
      }),
    ).toThrow("Identity email commands must use only the EMAIL channel");
  });
});
