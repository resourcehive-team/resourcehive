import { DeliveryProviderError } from "./delivery-provider";

const DELAYS = [30_000, 120_000, 600_000, 3_600_000, 21_600_000];

export function decideRetry(error: unknown, attemptCount: number) {
  const providerError =
    error instanceof DeliveryProviderError
      ? error
      : new DeliveryProviderError(
          "UNEXPECTED_PROVIDER_ERROR",
          true,
          error instanceof Error ? error.message : "Unknown provider error",
        );
  const delay = DELAYS[attemptCount - 1];
  const retry = providerError.transient && delay !== undefined;
  return {
    retry,
    nextAttemptAt: retry ? new Date(Date.now() + delay) : undefined,
    code: providerError.code,
    message: providerError.message,
  };
}
