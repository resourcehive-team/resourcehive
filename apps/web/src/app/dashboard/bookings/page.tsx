import Link from "next/link";
import { CalendarPlusIcon } from "lucide-react";

import { BookingSections } from "@/components/booking-sections";
import { ScreenHeading } from "@/components/screen-heading";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export default function BookingsPage() {
  return (
    <>
      <SiteHeader title="Bookings" />
      <main className="app-page @container/main">
        <ScreenHeading
          eyebrow="Reservations"
          title="Bookings"
          description="Review upcoming and past reservations, keep booking references close, download receipts when needed, and review bookings for resources you administer."
          actions={
            <Button render={<Link href="/dashboard/resources" />}>
              <CalendarPlusIcon data-icon="inline-start" />
              Create booking
            </Button>
          }
        />
        <BookingSections />
      </main>
    </>
  );
}
