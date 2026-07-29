import { AuthenticatedUser } from "@resourcehive/service-auth";
import { Socket } from "socket.io";

export interface NotificationSocketData {
  authenticatedUser?: AuthenticatedUser;
}

export interface NotificationServerEvents {
  "notification.connection.ready": (payload: {
    eventType: "notification.connection.ready";
    eventVersion: 1;
    occurredAt: string;
  }) => void;
}

export type AuthenticatedNotificationSocket = Socket<
  Record<string, never>,
  NotificationServerEvents,
  Record<string, never>,
  NotificationSocketData
>;
