import { RootOrganizationList } from "@/components/root-organization-list";
import { ScreenHeading } from "@/components/screen-heading";
import { SiteHeader } from "@/components/site-header";

export default function OrganizationsPage() {
  return (
    <>
      <SiteHeader title="Organizations" />
      <main className="app-page @container/main">
        <ScreenHeading
          eyebrow="Campus network"
          title="Organizations"
          description="Explore the schools, departments, clubs, and communities connected through ResourceHive."
        />
        <RootOrganizationList />
      </main>
    </>
  );
}
