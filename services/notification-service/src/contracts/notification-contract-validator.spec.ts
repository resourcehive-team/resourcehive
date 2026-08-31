import {
  NotificationContractError,
  parseNotificationCommand,
} from "./notification-contract-validator";

const validCommand = {
  kind: "notification.command",
  commandId: "11111111-1111-4111-8111-111111111111",
  idempotencyKey: "booking-confirmed/booking-id/user-id",
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
    ).toThrow("recipient requires userId or email");
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
});
