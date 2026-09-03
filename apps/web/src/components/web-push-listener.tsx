"use client";

import { useEffect } from "react";

import { listenForWebPush } from "@/lib/web-push";

export function WebPushListener() {
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    void listenForWebPush((payload) => {
      window.dispatchEvent(new Event("resourcehive:notification-received"));
      if (Notification.permission !== "granted" || !payload.notification) {
        return;
      }

      void navigator.serviceWorker.ready.then((registration) =>
        registration.showNotification(
          payload.notification?.title ?? "ResourceHive notification",
          {
            body: payload.notification?.body,
            icon: "/resourcehive-mark.svg",
            data: { url: "/dashboard/notifications" },
          },
        ),
      );
    })
      .then((stop) => {
        unsubscribe = stop;
      })
      .catch(() => undefined);

    return () => unsubscribe?.();
  }, []);

  return null;
}
