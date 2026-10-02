"use client";

import { useEffect } from "react";

export function WebPushListener() {
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let starting = false;
    let stopped = false;

    const start = () => {
      if (
        starting ||
        unsubscribe ||
        stopped ||
        !("Notification" in window) ||
        Notification.permission !== "granted"
      ) {
        return;
      }
      starting = true;

      void import("@/lib/web-push")
        .then(({ listenForWebPush }) =>
          listenForWebPush((payload) => {
            window.dispatchEvent(
              new Event("resourcehive:notification-received"),
            );
            if (
              Notification.permission !== "granted" ||
              !payload.notification
            ) {
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
          }),
        )
        .then((stop) => {
          if (stopped) stop?.();
          else unsubscribe = stop;
        })
        .catch(() => undefined)
        .finally(() => {
          starting = false;
        });
    };

    const handleEnabled = () => start();
    window.addEventListener("resourcehive:webpush-enabled", handleEnabled);
    if ("Notification" in window && Notification.permission === "granted")
      start();

    return () => {
      stopped = true;
      window.removeEventListener("resourcehive:webpush-enabled", handleEnabled);
      unsubscribe?.();
    };
  }, []);

  return null;
}
