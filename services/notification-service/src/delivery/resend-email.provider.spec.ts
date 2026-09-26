import { Resend } from "resend";
import { ResendEmailProvider } from "./resend-email.provider";

jest.mock("resend", () => ({
  Resend: jest.fn(),
}));

describe("ResendEmailProvider", () => {
  const message = {
    deliveryId: "delivery-id",
    destination: "alex@example.edu",
    subject: "ResourceHive password reset",
    body: "Open the reset link.",
    data: {},
  };
  const originalEnvironment = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnvironment };
    jest.clearAllMocks();
  });

  it("uses the console provider when Resend is disabled", async () => {
    process.env.RESEND_ENABLED = "false";
    const consoleProvider = {
      send: jest.fn().mockResolvedValue({ providerMessageId: "console-id" }),
    };
    const provider = new ResendEmailProvider(consoleProvider as never);

    await expect(provider.send(message)).resolves.toEqual({
      providerMessageId: "console-id",
    });
    expect(consoleProvider.send).toHaveBeenCalledWith(message);
    expect(Resend).not.toHaveBeenCalled();
  });

  it("sends through Resend with the delivery ID as the idempotency key", async () => {
    process.env.RESEND_ENABLED = "true";
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.RESEND_FROM_EMAIL = "ResourceHive <no-reply@example.com>";
    const send = jest.fn().mockResolvedValue({
      data: { id: "resend-message-id" },
      error: null,
    });
    (Resend as jest.Mock).mockImplementationOnce(() => ({
      emails: { send },
    }));
    const consoleProvider = { send: jest.fn() };
    const provider = new ResendEmailProvider(consoleProvider as never);

    await expect(provider.send(message)).resolves.toEqual({
      providerMessageId: "resend-message-id",
    });
    expect(send).toHaveBeenCalledWith(
      {
        from: "ResourceHive <no-reply@example.com>",
        to: "alex@example.edu",
        subject: "ResourceHive password reset",
        text: "Open the reset link.",
      },
      { idempotencyKey: "delivery-id" },
    );
    expect(consoleProvider.send).not.toHaveBeenCalled();
  });
});
