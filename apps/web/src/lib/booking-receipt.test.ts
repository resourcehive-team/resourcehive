import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import {
  bookingReceiptFilename,
  createBookingReceiptPdf,
} from "@/lib/booking-receipt";
import type { CreatedBooking } from "@/lib/booking-service/types";

const booking: CreatedBooking = {
  id: "booking-123",
  resourceSlotId: "slot-123",
  resourceId: "resource-123",
  resourceName: "Main Library Study Room",
  userId: "user-123",
  status: "Confirmed",
  startsAt: "2030-08-20T10:00:00.000Z",
  endsAt: "2030-08-20T11:30:00.000Z",
  pointsDeducted: 10,
  createdAt: "2030-08-18T10:00:00.000Z",
};

describe("booking receipt", () => {
  it("creates a one-page PDF with booking metadata", async () => {
    const bytes = await createBookingReceiptPdf(booking, {
      generatedAt: new Date("2030-08-18T12:00:00.000Z"),
      timeZone: "UTC",
    });
    const pdf = await PDFDocument.load(bytes);

    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getTitle()).toBe("ResourceHive booking receipt booking-123");
    expect(pdf.getAuthor()).toBe("ResourceHive");
    expect(pdf.getSubject()).toBe(
      "Booking confirmation for Main Library Study Room",
    );
    expect(bytes.byteLength).toBeGreaterThan(1_000);
  });

  it("creates a filesystem-safe receipt filename", () => {
    expect(bookingReceiptFilename(" Booking / 123 ")).toBe(
      "resourcehive-booking-booking-123.pdf",
    );
    expect(bookingReceiptFilename("   ")).toBe(
      "resourcehive-booking-receipt.pdf",
    );
  });
});
