"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listNotifications } from "@/lib/notification-api";

export function NotificationsStatCard() {
  const [unreadCount, setUnreadCount] = React.useState<number | null>(null);
  const [error, setError] = React.useState<boolean>(false);

  React.useEffect(() => {
    const controller = new AbortController();

    listNotifications()
      .then((notifications) => {
        if (controller.signal.aborted) return;
        const unread = notifications.filter((n) => n.readAt === null).length;
        setUnreadCount(unread);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError(true);
        }
      });

    return () => controller.abort();
  }, []);

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardDescription className="text-destructive">Unread notifications</CardDescription>
          <CardTitle className="text-3xl font-medium tabular-nums text-destructive">
            —
          </CardTitle>
          <CardAction>
            <Badge variant="destructive">Error</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Unable to load notifications.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (unreadCount === null) {
    return (
      <Card aria-busy="true">
        <CardHeader>
          <CardDescription>Unread notifications</CardDescription>
          <CardTitle className="text-3xl font-medium tabular-nums">—</CardTitle>
          <CardAction>
            <Badge variant="outline">Loading</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Checking notifications...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>Unread notifications</CardDescription>
        <CardTitle className="text-3xl font-medium tabular-nums">
          {unreadCount}
        </CardTitle>
        <CardAction>
          <Badge variant={unreadCount > 0 ? "default" : "outline"}>
            {unreadCount > 0 ? "New updates" : "Up to date"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Booking and membership updates will appear here.
        </p>
      </CardContent>
    </Card>
  );
}
