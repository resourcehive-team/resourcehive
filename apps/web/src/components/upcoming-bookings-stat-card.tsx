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
import { useUpcomingBookings } from "@/components/upcoming-bookings-provider";

export function UpcomingBookingsStatCard() {
  const { bookings, error } = useUpcomingBookings();
  const count = bookings?.length ?? null;

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardDescription>Upcoming bookings</CardDescription>
          <CardTitle className="text-3xl font-medium tabular-nums">—</CardTitle>
          <CardAction>
            <Badge variant="destructive">Error</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Could not load bookings.</p>
        </CardContent>
      </Card>
    );
  }

  if (count === null) {
    return (
      <Card aria-busy="true">
        <CardHeader>
          <CardDescription>Upcoming bookings</CardDescription>
          <CardTitle className="text-3xl font-medium tabular-nums">—</CardTitle>
          <CardAction>
            <Badge variant="outline">Loading</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Checking your schedule...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>Upcoming bookings</CardDescription>
        <CardTitle className="text-3xl font-medium tabular-nums">
          {count}
        </CardTitle>
        <CardAction>
          <Badge variant={count > 0 ? "success" : "outline"}>
            {count > 0 ? "Scheduled" : "None scheduled"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          {count > 0
            ? "You have confirmed bookings coming up."
            : "Your next confirmed booking will appear here."}
        </p>
      </CardContent>
    </Card>
  );
}
