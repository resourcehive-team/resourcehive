import "client-only";

import { apiGatewayUrl } from "@/lib/config";

type ApiRequestOptions = Omit<RequestInit, "body" | "credentials"> &
  (
    | {
        body?: BodyInit | null;
        json?: never;
      }
    | {
        body?: never;
        json: unknown;
      }
  );

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details: unknown = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ApiAuthenticationError extends ApiError {
  constructor(details: unknown = null) {
    super("Your session has expired. Log in again.", 401, details);
    this.name = "ApiAuthenticationError";
  }
}

export class ApiNetworkError extends Error {
  constructor() {
    super("Unable to connect to ResourceHive. Please try again.");
    this.name = "ApiNetworkError";
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const hasJsonBody = "json" in options;
  const {
    body: requestBody,
    json: jsonBody,
    ...requestOptions
  } = options;
  const headers = new Headers(options.headers);
  const body = prepareRequestBody(
    hasJsonBody,
    requestBody,
    jsonBody,
    headers,
  );
  let response: Response;

  try {
    response = await fetch(createApiUrl(path), {
      ...requestOptions,
      body,
      credentials: "include",
      headers,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    throw new ApiNetworkError();
  }

  const responseData = await readResponseData(response);

  if (response.status === 401) {
    throw new ApiAuthenticationError(responseData);
  }

  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(responseData, response.status),
      response.status,
      responseData,
    );
  }

  return responseData as T;
}

function createApiUrl(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("API request paths must start with a single forward slash");
  }

  return new URL(path.slice(1), `${apiGatewayUrl.replace(/\/+$/, "")}/`).href;
}

function prepareRequestBody(
  hasJsonBody: boolean,
  requestBody: BodyInit | null | undefined,
  jsonBody: unknown,
  headers: Headers,
): BodyInit | null | undefined {
  if (!hasJsonBody) {
    return requestBody;
  }

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return JSON.stringify(jsonBody);
}

async function readResponseData(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) {
    return undefined;
  }

  const responseText = await response.text();
  if (!responseText) {
    return undefined;
  }

  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    throw new ApiError(
      "ResourceHive returned an invalid response.",
      response.status,
    );
  }
}

function getErrorMessage(data: unknown, status: number): string {
  if (data && typeof data === "object" && "message" in data) {
    if (typeof data.message === "string") {
      return data.message;
    }

    if (
      Array.isArray(data.message) &&
      data.message.every((message) => typeof message === "string")
    ) {
      return data.message.join(" ");
    }
  }

  return `ResourceHive request failed with status ${status}.`;
}
