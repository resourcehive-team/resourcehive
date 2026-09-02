import { NOTIFICATION_TOPICS } from "./contracts";
import { KafkaNotificationTransport } from "./kafka-notification.transport";
import { NotificationKafkaOptions } from "./notification-client.options";
import { NotificationClientService } from "./notification-client.service";

describe("NotificationClientService", () => {
  const publish = jest.fn<Promise<void>, [string, string, unknown]>();
  const transport = {
    publish,
  } as unknown as KafkaNotificationTransport;
  const options: NotificationKafkaOptions = {
    enabled: true,
    brokers: ["broker:9092"],
    clientId: "resource-service",
    producer: "resource-service",
    ssl: true,
  };
  const service = new NotificationClientService(options, transport);

  beforeEach(() => jest.clearAllMocks());

  it("publishes a validated general command keyed by recipient", async () => {
    const command = await service.send({
      commandId: "11111111-1111-4111-8111-111111111111",
      recipientUserId: "22222222-2222-4222-8222-222222222222",
      title: "Resource updated",
      message: "Lab hours changed.",
      correlationId: "33333333-3333-4333-8333-333333333333",
    });

    expect(command.producer).toBe("resource-service");
    expect(command.channels).toEqual(["IN_APP", "PUSH"]);
    expect(publish).toHaveBeenCalledWith(
      NOTIFICATION_TOPICS.commands,
      "22222222-2222-4222-8222-222222222222",
      command,
    );
  });

  it("prevents non-identity producers from sending verification email", async () => {
    await expect(
      service.sendVerificationEmail({
        recipientUserId: "22222222-2222-4222-8222-222222222222",
        email: "user@example.edu",
        verificationUrl: "https://app.example/verify?token=x",
      }),
    ).rejects.toThrow("Only Identity Service");
    expect(publish).not.toHaveBeenCalled();
  });

  it("publishes verification email to the restricted identity topic", async () => {
    const identityService = new NotificationClientService(
      {
        ...options,
        clientId: "identity-service",
        producer: "identity-service",
      },
      transport,
    );
    const command = await identityService.sendVerificationEmail({
      commandId: "11111111-1111-4111-8111-111111111111",
      recipientUserId: "22222222-2222-4222-8222-222222222222",
      email: "user@example.edu",
      verificationUrl: "https://app.example/verify?token=x",
      correlationId: "33333333-3333-4333-8333-333333333333",
    });

    expect(command.channels).toEqual(["EMAIL"]);
    expect(publish).toHaveBeenCalledWith(
      NOTIFICATION_TOPICS.identityCommands,
      "22222222-2222-4222-8222-222222222222",
      command,
    );
  });

  it("propagates Kafka publishing failures", async () => {
    publish.mockRejectedValueOnce(new Error("broker unavailable"));
    await expect(
      service.send({
        recipientUserId: "22222222-2222-4222-8222-222222222222",
        title: "Resource updated",
        message: "Lab hours changed.",
      }),
    ).rejects.toThrow("broker unavailable");
  });
});
