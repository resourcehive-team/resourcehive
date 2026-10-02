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
import { Skeleton } from "@/components/ui/skeleton";
import { RequestErrorCard } from "@/components/request-error-card";

export function UpcomingBookingsCard() {
  const { bookings, error, retry } = useUpcomingBookings();

  if (error) {
    return (
      <RequestErrorCard
        error={error}
        subject="Upcoming bookings"
        onRetry={retry}
      />
    );
  }

  if (bookings === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming bookings</CardTitle>
          <CardDescription>
            Your confirmed resource reservations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming bookings</CardTitle>
        <CardDescription>
          Your confirmed resource reservations.
        </CardDescription>
        <CardAction>
          <Badge variant="secondary">{bookings.length} upcoming</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <>
            <p className="font-medium">No upcoming bookings</p>
            <p className="text-muted-foreground">
              Confirmed bookings will appear here with their date and time.
            </p>
          </>
        ) : (
          <ul className="space-y-4">
            {bookings.slice(0, 5).map((booking) => {
              const start = new Date(booking.resourceSlot.startsAt);
              const end = new Date(booking.resourceSlot.endsAt);
              
              // Simple formatting logic
              const dateOptions: Intl.DateTimeFormatOptions = { 
                weekday: 'short', month: 'short', day: 'numeric' 
              };
              const timeOptions: Intl.DateTimeFormatOptions = { 
                hour: 'numeric', minute: '2-digit' 
              };
              
              const dateStr = start.toLocaleDateString(undefined, dateOptions);
              const timeStr = `${start.toLocaleTimeString(undefined, timeOptions)} - ${end.toLocaleTimeString(undefined, timeOptions)}`;

              return (
                <li key={booking.id} className="flex flex-col gap-1 border-b last:border-0 pb-3 last:pb-0">
                  <span className="font-medium">{booking.resourceSlot.resource.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {dateStr} &bull; {timeStr}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
