import { apiRequest } from "@/lib/api-client";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export function listNotifications(): Promise<NotificationItem[]> {
  return apiRequest("/notifications");
}

export function sendDevelopmentPush(): Promise<{
  notificationId?: string;
  pushDeliveriesQueued: number;
}> {
  return apiRequest("/notifications/test-push", { method: "POST" });
}
