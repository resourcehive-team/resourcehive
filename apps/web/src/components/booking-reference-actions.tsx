"use client";

import * as React from "react";
import { CheckIcon, CopyIcon, DownloadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CreatedBooking } from "@/lib/booking-service/types";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

export function CopyBookingReferenceButton({
  referenceId,
}: {
  referenceId: string;
}) {
  const [status, setStatus] = React.useState<"idle" | "copied" | "error">(
    "idle",
  );

  async function copyReference() {
    try {
      await copyTextToClipboard(referenceId);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label={
        status === "copied"
          ? "Booking reference copied"
          : status === "error"
            ? "Try copying booking reference again"
            : "Copy booking reference"
      }
      onClick={copyReference}
    >
      {status === "copied" ? (
        <CheckIcon data-icon="inline-start" />
      ) : (
        <CopyIcon data-icon="inline-start" />
      )}
      {status === "copied"
        ? "Copied"
        : status === "error"
          ? "Retry copy"
          : "Copy"}
    </Button>
  );
}

export function DownloadBookingReceiptButton({
  booking,
}: {
  booking: CreatedBooking;
}) {
  const [status, setStatus] = React.useState<
    "idle" | "creating" | "downloaded" | "error"
  >("idle");

  async function downloadReceipt() {
    if (status === "creating") {
      return;
    }

    setStatus("creating");

    try {
      const { bookingReceiptFilename, createBookingReceiptPdf } = await import(
        "@/lib/booking-receipt"
      );
      const receipt = await createBookingReceiptPdf(booking);

      downloadPdf(receipt, bookingReceiptFilename(booking.id));
      setStatus("downloaded");
    } catch {
      setStatus("error");
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={status === "creating"}
      aria-label={
        status === "error"
          ? "Try downloading booking receipt again"
          : "Download booking receipt"
      }
      onClick={downloadReceipt}
    >
      {status === "downloaded" ? (
        <CheckIcon data-icon="inline-start" />
      ) : (
        <DownloadIcon data-icon="inline-start" />
      )}
      {status === "creating"
        ? "Preparing receipt..."
        : status === "downloaded"
          ? "Receipt downloaded"
          : status === "error"
            ? "Retry download"
            : "Download receipt"}
    </Button>
  );
}

function downloadPdf(bytes: Uint8Array, filename: string) {
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const url = URL.createObjectURL(
    new Blob([buffer], { type: "application/pdf" }),
  );
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
