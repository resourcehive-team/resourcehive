import { NotificationCommandV1 } from "../../contracts";
import { RenderedNotification } from "../notification-template.service";

export function renderBooking(
  command: NotificationCommandV1,
): RenderedNotification {
  const name = String(command.template.variables.resourceName ?? "resource");
  if (command.template.key === "booking.confirmed.v1") {
    const message = `Your booking for ${name} is confirmed.`;
    return {
      type: "BOOKING_CONFIRMED",
      title: "Booking confirmed",
      message,
      emailSubject: "Your ResourceHive booking is confirmed",
      emailText: message,
    };
  }
  if (command.template.key === "booking.cancelled.v1") {
    const refund = command.template.variables.refundPoints;
    const message = `Your booking for ${name} was cancelled.${typeof refund === "number" ? ` ${refund} points were refunded.` : ""}`;
    return {
      type: "BOOKING_CANCELLED",
      title: "Booking cancelled",
      message,
      emailSubject: "Your ResourceHive booking was cancelled",
      emailText: message,
    };
  }
  if (command.template.key === "booking.completed.v1") {
    const message = `Your booking for ${name} is complete.`;
    return {
      type: "BOOKING_COMPLETED",
      title: "Booking completed",
      message,
      emailSubject: "Booking completed",
      emailText: message,
    };
  }
  throw new Error("Unsupported booking template");
}
