"use client";

import { useCallback, useEffect, useState } from "react";
import { BellIcon, SendIcon } from "lucide-react";

import { ScreenHeading } from "@/components/screen-heading";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  enableWebPush,
  listNotifications,
  sendDevelopmentPush,
  type NotificationItem,
} from "@/lib/web-push";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string>();

  const load = useCallback(async () => {
    try {
      setNotifications(await listNotifications());
      setMessage(undefined);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load notifications.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve(Notification.permission).then(setPermission);
    const initialLoad = window.setTimeout(() => void load(), 0);
    window.addEventListener("resourcehive:notification-received", load);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("resourcehive:notification-received", load);
    };
  }, [load]);

  async function enableNotifications() {
    setWorking(true);
    try {
      await enableWebPush();
      setPermission(Notification.permission);
      setMessage("Browser notifications are enabled.");
    } catch (error) {
      setPermission(Notification.permission);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to enable notifications.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function sendTest() {
    setWorking(true);
    try {
      await sendDevelopmentPush();
      await load();
      setMessage("Test notification queued.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to send the test notification.",
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <SiteHeader title="Notifications" />
      <main className="app-page @container/main">
        <ScreenHeading
          eyebrow="Updates"
          title="Your notifications"
          description="See ResourceHive activity here and enable browser alerts on this laptop."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={enableNotifications}
                disabled={working || permission === "granted"}
              >
                <BellIcon data-icon="inline-start" />
                {permission === "granted"
                  ? "Browser alerts enabled"
                  : "Enable browser alerts"}
              </Button>
              {process.env.NODE_ENV === "development" ? (
                <Button variant="outline" onClick={sendTest} disabled={working}>
                  <SendIcon data-icon="inline-start" />
                  Send test
                </Button>
              ) : null}
            </div>
          }
        />

        {message ? (
          <p className="text-sm text-muted-foreground">{message}</p>
        ) : null}

        <div className="grid gap-4">
          {loading ? (
            <Card>
              <CardContent>Loading notifications…</CardContent>
            </Card>
          ) : notifications.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No notifications yet</CardTitle>
                <CardDescription>
                  Booking and account updates will appear here.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            notifications.map((notification) => (
              <Card key={notification.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>{notification.title}</CardTitle>
                      <CardDescription>
                        {new Date(notification.createdAt).toLocaleString()}
                      </CardDescription>
                    </div>
                    {!notification.readAt ? <Badge>New</Badge> : null}
                  </div>
                </CardHeader>
                <CardContent>{notification.message}</CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </>
  );
}
