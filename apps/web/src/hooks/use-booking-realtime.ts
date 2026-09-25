import * as React from "react";
import {
  type BookingRealtimeEvent,
  getRealtimeSocket,
} from "@/lib/realtime";

/**
 * Subscribes to live booking/slot events for a resource's calendar.
 * The server also auto-joins every connected socket to its own
 * `user:{userId}` room, so events addressed to the current user arrive
 * without watching any particular resource.
 */
export function useBookingRealtime(
  resourceId: string | undefined,
  onEvent: (event: BookingRealtimeEvent) => void,
): void {
  const onEventRef = React.useRef(onEvent);
  onEventRef.current = onEvent;

  React.useEffect(() => {
    const socket = getRealtimeSocket();
    const handleEvent = (event: BookingRealtimeEvent) => {
      onEventRef.current(event);
    };

    socket.on("booking.event", handleEvent);
    if (resourceId) {
      socket.emit("resource.watch", resourceId);
    }

    return () => {
      socket.off("booking.event", handleEvent);
      if (resourceId) {
        socket.emit("resource.unwatch", resourceId);
      }
    };
  }, [resourceId]);
}
