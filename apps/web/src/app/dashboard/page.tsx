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
            <div className="px-4 lg:px-6">
              <UpcomingBookingsCard />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
