"use client";

import { AlertCircleIcon, RefreshCwIcon } from "lucide-react";

import {
  ApiAuthenticationError,
  ApiError,
  ApiNetworkError,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function RequestErrorCard({
  error,
  subject,
  onRetry,
}: {
  error: unknown;
  subject: string;
  onRetry: () => void;
}) {
  const message = getErrorMessage(error, subject);
  const canRetry =
    !(error instanceof ApiAuthenticationError) &&
    !(error instanceof ApiError && error.status === 403);

  return (
    <Card role="alert">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircleIcon className="size-4" />
          {message.title}
        </CardTitle>
        <CardDescription>{message.description}</CardDescription>
      </CardHeader>
      {canRetry ? (
        <CardContent>
          <Button variant="outline" onClick={onRetry}>
            <RefreshCwIcon data-icon="inline-start" />
            Try again
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}

function getErrorMessage(
  error: unknown,
  subject: string,
): {
  title: string;
  description: string;
} {
  if (error instanceof ApiAuthenticationError) {
    return {
      title: "Your session has expired",
      description: "Redirecting you to the login page.",
    };
  }

  if (error instanceof ApiError && error.status === 403) {
    return {
      title: `${subject} unavailable`,
      description:
        "Your account does not have permission to view this information.",
    };
  }

  if (error instanceof ApiNetworkError) {
    return {
      title: "ResourceHive could not be reached",
      description:
        "Check your connection and make sure the API gateway is running.",
    };
  }

  return {
    title: `${subject} could not be loaded`,
    description: "Please try again. If the problem continues, contact support.",
  };
}
