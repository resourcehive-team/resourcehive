import { NotificationCommandV1 } from "../contracts";
import { NotificationTemplateService } from "./notification-template.service";

describe("NotificationTemplateService", () => {
  it("renders an approved command without accepting producer HTML", () => {
    const command: NotificationCommandV1 = {
      kind: "notification.command",
      commandId: "11111111-1111-4111-8111-111111111111",
      producer: "booking-service",
      recipient: { userId: "22222222-2222-4222-8222-222222222222" },
      channels: ["IN_APP"],
      template: {
        key: "booking.confirmed.v1",
        version: 1,
        variables: {
          resourceName: "Robotics Lab",
          message: "<b>Producer-controlled content</b>",
        },
      },
      correlationId: "33333333-3333-4333-8333-333333333333",
      occurredAt: "2026-08-31T12:00:00.000Z",
    };
    expect(new NotificationTemplateService().render(command)).toEqual(
      expect.objectContaining({
        title: "Booking confirmed",
        message: "Your booking for Robotics Lab is confirmed.",
      }),
    );
  });

  it("renders fixed content for a development test push", () => {
    const command: NotificationCommandV1 = {
      kind: "notification.command",
      commandId: "11111111-1111-4111-8111-111111111111",
      producer: "notification-service",
      recipient: { userId: "22222222-2222-4222-8222-222222222222" },
      channels: ["IN_APP", "PUSH"],
      template: {
        key: "development.test-push.v1",
        version: 1,
        variables: {},
      },
      correlationId: "33333333-3333-4333-8333-333333333333",
      occurredAt: "2026-08-31T12:00:00.000Z",
    };

    expect(new NotificationTemplateService().render(command)).toEqual({
      type: "DEVELOPMENT_TEST_PUSH",
      title: "ResourceHive test notification",
      message: "Local Firebase Cloud Messaging is configured correctly.",
      emailSubject: "",
      emailText: "",
    });
  });

  it("renders a general service message as plain text", () => {
    const command: NotificationCommandV1 = {
      kind: "notification.command",
      commandId: "11111111-1111-4111-8111-111111111111",
      producer: "resource-service",
      recipient: { userId: "22222222-2222-4222-8222-222222222222" },
      channels: ["IN_APP", "PUSH"],
      template: {
        key: "notification.message.v1",
        version: 1,
        variables: {
          title: "Resource updated",
          message: "Robotics Lab hours changed.",
        },
      },
      correlationId: "33333333-3333-4333-8333-333333333333",
      occurredAt: "2026-08-31T12:00:00.000Z",
    };

    expect(new NotificationTemplateService().render(command)).toEqual({
      type: "NOTIFICATION_MESSAGE",
      title: "Resource updated",
      message: "Robotics Lab hours changed.",
      emailSubject: "",
      emailText: "",
    });
  });
});
