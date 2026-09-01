import "client-only";

import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
  type Unsubscribe,
} from "firebase/messaging";

import { apiRequest } from "@/lib/api-client";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export async function enableWebPush(): Promise<void> {
  const messaging = await browserMessaging();
  if (!messaging) {
    throw new Error("This browser does not support web push notifications.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Browser notification permission was not granted.");
  }

  const registration = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js",
  );
  const token = await getToken(messaging, {
    serviceWorkerRegistration: registration,
    vapidKey: requiredEnv(
      "NEXT_PUBLIC_FIREBASE_VAPID_KEY",
      process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    ),
  });
  if (!token) {
    throw new Error("Firebase did not return a web push token.");
  }

  await apiRequest("/notifications/push-subscriptions", {
    method: "POST",
    json: { token },
  });
}

export async function listenForWebPush(
  handler: (payload: MessagePayload) => void,
): Promise<Unsubscribe | undefined> {
  const messaging = await browserMessaging();
  return messaging ? onMessage(messaging, handler) : undefined;
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

async function browserMessaging() {
  if (typeof window === "undefined" || !(await isSupported())) {
    return undefined;
  }

  const config = {
    apiKey: requiredEnv("NEXT_PUBLIC_FIREBASE_API_KEY", firebaseConfig.apiKey),
    authDomain: requiredEnv(
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
      firebaseConfig.authDomain,
    ),
    projectId: requiredEnv(
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      firebaseConfig.projectId,
    ),
    messagingSenderId: requiredEnv(
      "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
      firebaseConfig.messagingSenderId,
    ),
    appId: requiredEnv("NEXT_PUBLIC_FIREBASE_APP_ID", firebaseConfig.appId),
  };
  const app = getApps().length ? getApp() : initializeApp(config);
  return getMessaging(app);
}

function requiredEnv(name: string, value: string | undefined): string {
  if (!value?.trim()) {
    throw new Error(`${name} is required for browser notifications.`);
  }
  return value.trim();
}
