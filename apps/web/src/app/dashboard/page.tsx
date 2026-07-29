import { RecentActivityCard } from "@/components/recent-activity-card";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import { UpcomingBookingsCard } from "@/components/upcoming-bookings-card";

export default function Page() {
  return (
    <>
      <SiteHeader title="Dashboard" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <SectionCards />
            <div className="grid gap-4 px-4 md:grid-cols-2 lg:px-6">
              <UpcomingBookingsCard />
              <RecentActivityCard />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
