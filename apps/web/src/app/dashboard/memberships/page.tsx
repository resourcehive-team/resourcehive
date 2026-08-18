import { CurrentMembershipList } from "@/components/current-membership-list";
import { ScreenHeading } from "@/components/screen-heading";
import { SiteHeader } from "@/components/site-header";

export default function MembershipsPage() {
  return (
    <>
      <SiteHeader title="My memberships" />
      <main className="app-page @container/main">
        <ScreenHeading
          eyebrow="Your network"
          title="My memberships"
          description="View the organizations you belong to and follow the status of pending requests."
        />
        <CurrentMembershipList />
      </main>
    </>
  );
}
