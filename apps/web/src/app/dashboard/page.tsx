import { RecentActivityCard } from "@/components/recent-activity-card";
import { ScreenHeading } from "@/components/screen-heading";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import { UpcomingBookingsCard } from "@/components/upcoming-bookings-card";

export default function Page() {
  return (
    <>
      <SiteHeader title="Dashboard" />
      <main className="app-page @container/main">
        <ScreenHeading
          eyebrow="Campus overview"
          title="Everything shared, in one place."
          description="Track the resources, memberships, and activity that connect you to your campus community."
        />
        <SectionCards />
        <div className="shared-panel-grid *:data-[slot=card]:border-0 md:grid-cols-2">
          <UpcomingBookingsCard />
          <RecentActivityCard />
        </div>
      </main>
    </>
  );
}
