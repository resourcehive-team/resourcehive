import { PersonalAnalyticsSection } from "@/components/personal-analytics";
import { ScreenHeading } from "@/components/screen-heading";
import { SiteHeader } from "@/components/site-header";

export default function AnalyticsPage() {
  return (
    <>
      <SiteHeader title="Analytics" />
      <main className="app-page @container/main">
        <ScreenHeading
          eyebrow="Usage insights"
          title="Analytics"
          description="See how you use resources over time and when they tend to be busiest."
        />
        <PersonalAnalyticsSection />
      </main>
    </>
  );
}
