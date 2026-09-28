import "client-only";

import { io, type Socket } from "socket.io-client";
import { apiUrl } from "@/lib/config";

export interface BookingRealtimeEvent {
  eventType:
    | "booking.confirmed"
    | "booking.cancelled"
    | "booking.completed"
    | "slot.created";
  occurredAt: string;
  payload: {
    bookingId?: string;
    slotId?: string;
    resourceId: string;
    resourceName: string;
    organizationId: string;
    userId?: string;
    startsAt: string;
    endsAt?: string;
    refundPoints?: number;
  };
}

let socket: Socket | null = null;

export function getRealtimeSocket(): Socket {
  if (!socket) {
    socket = io(apiUrl, {
      path: "/realtime/socket.io",
      withCredentials: true,
      autoConnect: true,
    });
  }
  return socket;
}
