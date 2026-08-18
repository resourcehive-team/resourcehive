import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import QRCode from "qrcode";

import type { CreatedBooking } from "@/lib/booking-service/types";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

const PAPER = rgb(243 / 255, 239 / 255, 231 / 255);
const PAPER_ALT = rgb(250 / 255, 248 / 255, 244 / 255);
const INK = rgb(28 / 255, 29 / 255, 29 / 255);
const FOREGROUND = rgb(23 / 255, 23 / 255, 21 / 255);
const MUTED = rgb(111 / 255, 107 / 255, 99 / 255);
const LINE = rgb(201 / 255, 195 / 255, 184 / 255);
const CLAY = rgb(201 / 255, 111 / 255, 72 / 255);

export interface BookingReceiptOptions {
  generatedAt?: Date;
  timeZone?: string;
}

export async function createBookingReceiptPdf(
  booking: CreatedBooking,
  options: BookingReceiptOptions = {},
): Promise<Uint8Array> {
  const generatedAt = validDate(options.generatedAt ?? new Date());
  const timeZone = options.timeZone ?? resolvedTimeZone();
  const pdf = await PDFDocument.create();
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  pdf.setTitle(`ResourceHive booking receipt ${booking.id}`);
  pdf.setAuthor("ResourceHive");
  pdf.setCreator("ResourceHive web application");
  pdf.setProducer("ResourceHive");
  pdf.setSubject(`Booking confirmation for ${booking.resourceName}`);
  pdf.setCreationDate(generatedAt);

  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: PAPER,
  });

  drawHeader(page, serif, sansBold);
  drawConfirmation(page, serif, sans);
  drawReference(page, mono, sansBold, booking.id);
  drawDetailsGrid(page, sans, sansBold, booking, timeZone);
  drawNotice(page, serif, sans);
  drawFooter(page, sans, generatedAt, timeZone);

  return pdf.save();
}

export function bookingReceiptFilename(referenceId: string): string {
  const safeReference = referenceId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `resourcehive-booking-${safeReference || "receipt"}.pdf`;
}

function drawHeader(page: PDFPage, serif: PDFFont, sansBold: PDFFont) {
  page.drawText("ResourceHive", {
    x: PAGE_MARGIN,
    y: 774,
    size: 24,
    font: serif,
    color: FOREGROUND,
  });
  page.drawText("BOOKING RECEIPT", {
    x: PAGE_WIDTH - PAGE_MARGIN - 95,
    y: 780,
    size: 8,
    font: sansBold,
    color: CLAY,
  });
  drawRule(page, 752);
}

function drawConfirmation(page: PDFPage, serif: PDFFont, sans: PDFFont) {
  page.drawText("Reservation confirmed", {
    x: PAGE_MARGIN,
    y: 690,
    size: 34,
    font: serif,
    color: FOREGROUND,
  });
  page.drawText(
    "This receipt records the published resource slot confirmed by ResourceHive.",
    {
      x: PAGE_MARGIN,
      y: 664,
      size: 10.5,
      font: sans,
      color: MUTED,
    },
  );
}

function drawReference(
  page: PDFPage,
  mono: PDFFont,
  sansBold: PDFFont,
  referenceId: string,
) {
  const boxY = 566;
  const boxHeight = 68;
  const qrSize = 56;
  const qrX = PAGE_MARGIN + CONTENT_WIDTH - qrSize - 6;
  const qrY = boxY + 6;

  page.drawRectangle({
    x: PAGE_MARGIN,
    y: boxY,
    width: CONTENT_WIDTH,
    height: boxHeight,
    color: INK,
  });
  page.drawRectangle({
    x: PAGE_MARGIN,
    y: boxY,
    width: 6,
    height: boxHeight,
    color: CLAY,
  });
  page.drawText("BOOKING REFERENCE", {
    x: PAGE_MARGIN + 22,
    y: boxY + 43,
    size: 7.5,
    font: sansBold,
    color: PAPER,
  });
  drawReferenceQr(page, referenceId, qrX, qrY, qrSize);
  drawFittedText(page, pdfSafeText(referenceId), {
    x: PAGE_MARGIN + 22,
    y: boxY + 18,
    maxWidth: qrX - PAGE_MARGIN - 38,
    size: 13,
    minSize: 8,
    font: mono,
    color: PAPER,
  });
}

function drawReferenceQr(
  page: PDFPage,
  referenceId: string,
  x: number,
  y: number,
  size: number,
) {
  const qr = QRCode.create(referenceId, { errorCorrectionLevel: "M" });
  const quietZone = 4;
  const moduleCount = qr.modules.size;
  const moduleSize = size / (moduleCount + quietZone * 2);

  page.drawRectangle({ x, y, width: size, height: size, color: PAPER });

  for (let row = 0; row < moduleCount; row += 1) {
    for (let column = 0; column < moduleCount; column += 1) {
      if (!qr.modules.get(row, column)) {
        continue;
      }

      page.drawRectangle({
        x: x + (column + quietZone) * moduleSize,
        y: y + size - (row + quietZone + 1) * moduleSize,
        width: moduleSize,
        height: moduleSize,
        color: INK,
      });
    }
  }
}

function drawDetailsGrid(
  page: PDFPage,
  sans: PDFFont,
  sansBold: PDFFont,
  booking: CreatedBooking,
  timeZone: string,
) {
  const gridX = PAGE_MARGIN;
  const gridY = 330;
  const gridHeight = 204;
  const columnWidth = CONTENT_WIDTH / 2;
  const rowHeight = gridHeight / 3;

  page.drawRectangle({
    x: gridX,
    y: gridY,
    width: CONTENT_WIDTH,
    height: gridHeight,
    color: PAPER_ALT,
    borderColor: LINE,
    borderWidth: 1,
  });
  page.drawLine({
    start: { x: gridX + columnWidth, y: gridY },
    end: { x: gridX + columnWidth, y: gridY + gridHeight },
    thickness: 1,
    color: LINE,
  });

  for (let row = 1; row < 3; row += 1) {
    const y = gridY + rowHeight * row;
    page.drawLine({
      start: { x: gridX, y },
      end: { x: gridX + CONTENT_WIDTH, y },
      thickness: 1,
      color: LINE,
    });
  }

  const startsAt = validDate(new Date(booking.startsAt));
  const endsAt = validDate(new Date(booking.endsAt));
  const bookedAt = validDate(new Date(booking.createdAt));

  drawDetailCell(page, sans, sansBold, {
    column: 0,
    row: 0,
    label: "RESOURCE",
    value: booking.resourceName,
    gridX,
    gridY,
    columnWidth,
    rowHeight,
  });
  drawDetailCell(page, sans, sansBold, {
    column: 1,
    row: 0,
    label: "STATUS",
    value: booking.status || "Confirmed",
    gridX,
    gridY,
    columnWidth,
    rowHeight,
  });
  drawDetailCell(page, sans, sansBold, {
    column: 0,
    row: 1,
    label: "DATE",
    value: formatDate(startsAt, timeZone),
    gridX,
    gridY,
    columnWidth,
    rowHeight,
  });
  drawDetailCell(page, sans, sansBold, {
    column: 1,
    row: 1,
    label: "TIME",
    value: `${formatTime(startsAt, timeZone)} - ${formatTime(endsAt, timeZone)}`,
    note: timeZone,
    gridX,
    gridY,
    columnWidth,
    rowHeight,
  });
  drawDetailCell(page, sans, sansBold, {
    column: 0,
    row: 2,
    label: "POINTS DEDUCTED",
    value: String(booking.pointsDeducted),
    gridX,
    gridY,
    columnWidth,
    rowHeight,
  });
  drawDetailCell(page, sans, sansBold, {
    column: 1,
    row: 2,
    label: "BOOKED ON",
    value: formatDateTime(bookedAt, timeZone),
    gridX,
    gridY,
    columnWidth,
    rowHeight,
  });
}

function drawDetailCell(
  page: PDFPage,
  sans: PDFFont,
  sansBold: PDFFont,
  options: {
    column: 0 | 1;
    row: 0 | 1 | 2;
    label: string;
    value: string;
    note?: string;
    gridX: number;
    gridY: number;
    columnWidth: number;
    rowHeight: number;
  },
) {
  const cellX = options.gridX + options.column * options.columnWidth;
  const cellTop =
    options.gridY + (3 - options.row) * options.rowHeight;
  const textX = cellX + 16;
  const maxWidth = options.columnWidth - 32;

  page.drawText(options.label, {
    x: textX,
    y: cellTop - 21,
    size: 7.5,
    font: sansBold,
    color: CLAY,
  });
  drawFittedText(page, pdfSafeText(options.value), {
    x: textX,
    y: cellTop - 43,
    maxWidth,
    size: 11,
    minSize: 8.5,
    font: sans,
    color: FOREGROUND,
  });

  if (options.note) {
    drawFittedText(page, pdfSafeText(options.note), {
      x: textX,
      y: cellTop - 57,
      maxWidth,
      size: 7.5,
      minSize: 6.5,
      font: sans,
      color: MUTED,
    });
  }
}

function drawNotice(page: PDFPage, serif: PDFFont, sans: PDFFont) {
  page.drawText("Keep this reference close.", {
    x: PAGE_MARGIN,
    y: 265,
    size: 20,
    font: serif,
    color: FOREGROUND,
  });
  page.drawText(
    "Use the booking reference when contacting the resource owner or support.",
    {
      x: PAGE_MARGIN,
      y: 242,
      size: 10,
      font: sans,
      color: MUTED,
    },
  );

  page.drawRectangle({
    x: PAGE_MARGIN,
    y: 144,
    width: CONTENT_WIDTH,
    height: 62,
    color: INK,
  });
  page.drawText("DIGITAL CONFIRMATION", {
    x: PAGE_MARGIN + 16,
    y: 181,
    size: 7.5,
    font: sans,
    color: CLAY,
  });
  page.drawText(
    "This receipt confirms the booking response recorded by ResourceHive.",
    {
      x: PAGE_MARGIN + 16,
      y: 161,
      size: 9.5,
      font: sans,
      color: PAPER,
    },
  );
}

function drawFooter(
  page: PDFPage,
  sans: PDFFont,
  generatedAt: Date,
  timeZone: string,
) {
  const footerLabel = "Digital booking receipt";

  drawRule(page, 96);
  page.drawText(
    `Generated ${formatDateTime(generatedAt, timeZone)} | ${timeZone}`,
    {
      x: PAGE_MARGIN,
      y: 72,
      size: 7.5,
      font: sans,
      color: MUTED,
    },
  );
  page.drawText(footerLabel, {
    x:
      PAGE_WIDTH -
      PAGE_MARGIN -
      sans.widthOfTextAtSize(footerLabel, 7.5),
    y: 72,
    size: 7.5,
    font: sans,
    color: MUTED,
  });
}

function drawRule(page: PDFPage, y: number) {
  page.drawLine({
    start: { x: PAGE_MARGIN, y },
    end: { x: PAGE_WIDTH - PAGE_MARGIN, y },
    thickness: 1,
    color: LINE,
  });
}

function drawFittedText(
  page: PDFPage,
  text: string,
  options: {
    x: number;
    y: number;
    maxWidth: number;
    size: number;
    minSize: number;
    font: PDFFont;
    color: ReturnType<typeof rgb>;
  },
) {
  let size = options.size;

  while (
    size > options.minSize &&
    options.font.widthOfTextAtSize(text, size) > options.maxWidth
  ) {
    size -= 0.25;
  }

  const fittedText =
    options.font.widthOfTextAtSize(text, size) <= options.maxWidth
      ? text
      : truncateText(text, options.font, size, options.maxWidth);

  page.drawText(fittedText, {
    x: options.x,
    y: options.y,
    size,
    font: options.font,
    color: options.color,
  });
}

function truncateText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string {
  const suffix = "...";
  let value = text;

  while (
    value.length > 0 &&
    font.widthOfTextAtSize(`${value}${suffix}`, size) > maxWidth
  ) {
    value = value.slice(0, -1);
  }

  return `${value}${suffix}`;
}

function pdfSafeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?");
}

function formatDate(value: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone,
  }).format(value);
}

function formatTime(value: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(value);
}

function formatDateTime(value: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(value);
}

function resolvedTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function validDate(value: Date): Date {
  if (Number.isNaN(value.getTime())) {
    throw new Error("The booking receipt contains an invalid date.");
  }

  return value;
}
