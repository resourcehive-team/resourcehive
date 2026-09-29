"use client";

import * as React from "react";
import { getMyBookings } from "@/lib/booking-service/booking-api";
import type { UserBooking } from "@/lib/booking-service/types";

type BookingsContextType = {
  bookings: UserBooking[] | null;
  error: unknown;
  retry: () => void;
};

const BookingsContext = React.createContext<BookingsContextType>({
  bookings: null,
  error: null,
  retry: () => {},
});

export function UpcomingBookingsProvider({ children }: { children: React.ReactNode }) {
  const [bookings, setBookings] = React.useState<UserBooking[] | null>(null);
  const [error, setError] = React.useState<unknown>(null);
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();

    setBookings(null); // Reset when retrying
    setError(null);

    getMyBookings(controller.signal)
      .then((allBookings) => {
        const now = new Date().getTime();
        const upcoming = allBookings
          .filter(
            (b) =>
              b.status === "CONFIRMED" &&
              new Date(b.resourceSlot.startsAt).getTime() > now
          )
          .sort(
            (a, b) =>
              new Date(a.resourceSlot.startsAt).getTime() -
              new Date(b.resourceSlot.startsAt).getTime()
          );

        setBookings(upcoming);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err);
        }
      });

    return () => controller.abort();
  }, [attempt]);

  return (
    <BookingsContext.Provider
      value={{ bookings, error, retry: () => setAttempt((a) => a + 1) }}
    >
      {children}
    </BookingsContext.Provider>
  );
}

export function useUpcomingBookings() {
  return React.useContext(BookingsContext);
}
