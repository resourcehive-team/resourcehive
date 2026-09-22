import { AnalyticsSections } from "@/components/analytics-sections";
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
          description="See how you use resources over time, how organizations you administer are performing, and when things tend to be busiest."
        />
        <AnalyticsSections />
      </main>
    </>
  );
}
