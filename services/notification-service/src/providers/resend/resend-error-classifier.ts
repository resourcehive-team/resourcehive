import { DeliveryProviderError } from "../../delivery/delivery-provider";

export function classifyResendError(error: unknown): DeliveryProviderError {
  const value = (error ?? {}) as {
    name?: string;
    message?: string;
    statusCode?: number;
  };
  const code = value.name ?? `HTTP_${value.statusCode ?? "UNKNOWN"}`;
  const transient =
    value.statusCode === 429 ||
    (value.statusCode ?? 0) >= 500 ||
    code === "concurrent_idempotent_requests";
  return new DeliveryProviderError(
    code,
    transient,
    value.message ?? "Resend rejected the email",
  );
}
