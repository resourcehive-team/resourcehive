import { OrganizationAnalyticsSection } from "@/components/organization-analytics";
import { PersonalAnalyticsSection } from "@/components/personal-analytics";
import { PlatformAnalyticsPlaceholder } from "@/components/platform-analytics-placeholder";
import { ScreenHeading } from "@/components/screen-heading";
import { SiteHeader } from "@/components/site-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
        <Tabs defaultValue="me" className="gap-6">
          <TabsList>
            <TabsTrigger value="me">My analytics</TabsTrigger>
            <TabsTrigger value="org">Organization</TabsTrigger>
            <TabsTrigger value="platform">Platform</TabsTrigger>
          </TabsList>

          <TabsContent value="me">
            <PersonalAnalyticsSection />
          </TabsContent>

          <TabsContent value="org">
            <OrganizationAnalyticsSection />
          </TabsContent>

          <TabsContent value="platform">
            <PlatformAnalyticsPlaceholder />
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
