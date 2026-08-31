import { DeliveryProviderError } from "../../delivery/delivery-provider";

const transientCodes = new Set([
  "messaging/internal-error",
  "messaging/server-unavailable",
  "messaging/message-rate-exceeded",
  "messaging/device-message-rate-exceeded",
]);
const invalidTargetCodes = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

export function classifyFcmError(error: unknown): DeliveryProviderError {
  const value = (error ?? {}) as { code?: string; message?: string };
  const code = value.code ?? "FCM_UNKNOWN_ERROR";
  return new DeliveryProviderError(
    code,
    transientCodes.has(code),
    value.message ?? "FCM rejected the push notification",
  );
}

export function isInvalidFcmTarget(error: unknown): boolean {
  return invalidTargetCodes.has((error as { code?: string })?.code ?? "");
}
