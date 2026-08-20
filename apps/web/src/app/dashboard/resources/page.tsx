import { ResourceCatalogue } from "@/components/resource-catalogue";
import { ScreenHeading } from "@/components/screen-heading";
import { SiteHeader } from "@/components/site-header";

export default function ResourcesPage() {
  return (
    <>
      <SiteHeader title="Resources" />
      <main className="app-page @container/main">
        <ScreenHeading
          eyebrow="Shared inventory"
          title="Resource catalogue"
          description="Browse equipment, spaces, and other resources available through your organizations."
        />
        <ResourceCatalogue />
      </main>
    </>
  );
}
