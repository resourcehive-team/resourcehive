import Link from "next/link";
import { CalendarPlusIcon } from "lucide-react";

import { MyBookings } from "@/components/my-bookings";
import { ScreenHeading } from "@/components/screen-heading";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export default function BookingsPage() {
  return (
    <>
      <SiteHeader title="My bookings" />
      <main className="app-page @container/main">
        <ScreenHeading
          eyebrow="Reservation history"
          title="My bookings"
          description="Review upcoming and past reservations, keep booking references close, and download receipts when needed."
          actions={
            <Button render={<Link href="/dashboard/resources" />}>
              <CalendarPlusIcon data-icon="inline-start" />
              Create booking
            </Button>
          }
        />
        <MyBookings />
      </main>
    </>
  );
}
