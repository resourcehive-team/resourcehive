import { NotificationConfigurationService } from "./notification-configuration.service";

describe("NotificationConfigurationService", () => {
  const original = process.env;

  beforeEach(() => {
    process.env = {
      ...original,
      RESEND_ENABLED: "false",
      FCM_ENABLED: "false",
      KAFKA_ENABLED: "false",
    };
  });

  afterAll(() => {
    process.env = original;
  });

  it("uses safe console providers by default", () => {
    expect(new NotificationConfigurationService().modes()).toEqual({
      kafka: "disabled",
      email: "console",
      push: "console",
    });
  });

  it("fails fast when Resend is enabled without secrets", () => {
    process.env.RESEND_ENABLED = "true";
    delete process.env.RESEND_API_KEY;

    expect(() => new NotificationConfigurationService().onModuleInit()).toThrow(
      "RESEND_API_KEY",
    );
  });

  it("fails fast when FCM is enabled without credentials", () => {
    process.env.FCM_ENABLED = "true";
    delete process.env.FIREBASE_PROJECT_ID;

    expect(() => new NotificationConfigurationService().onModuleInit()).toThrow(
      "FIREBASE_PROJECT_ID",
    );
  });

  it("fails fast when the FCM credential file cannot be found", () => {
    process.env.FCM_ENABLED = "true";
    process.env.FIREBASE_PROJECT_ID = "resourcehive-test";
    process.env.GOOGLE_APPLICATION_CREDENTIALS =
      "C:/missing/firebase-service-account.json";

    expect(() => new NotificationConfigurationService().onModuleInit()).toThrow(
      "does not point to an existing file",
    );
  });

  it("accepts an existing FCM credential file", () => {
    process.env.FCM_ENABLED = "true";
    process.env.FIREBASE_PROJECT_ID = "resourcehive-test";
    process.env.GOOGLE_APPLICATION_CREDENTIALS = __filename;

    expect(() =>
      new NotificationConfigurationService().onModuleInit(),
    ).not.toThrow();
  });

  it("rejects an unsafe delivery polling interval", () => {
    process.env.DELIVERY_POLL_INTERVAL_MS = "100";

    expect(() => new NotificationConfigurationService().onModuleInit()).toThrow(
      "DELIVERY_POLL_INTERVAL_MS",
    );
  });
});
