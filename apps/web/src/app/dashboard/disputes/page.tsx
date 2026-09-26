import { DisputeSections } from "@/components/dispute-sections";
import { ScreenHeading } from "@/components/screen-heading";
import { SiteHeader } from "@/components/site-header";

export default function DisputesPage() {
  return (
    <>
      <SiteHeader title="Disputes" />
      <main className="app-page @container/main">
        <ScreenHeading
          eyebrow="Booking issues"
          title="Disputes"
          description="Report a resource that was unavailable, broken, or didn't match the description, track the review of issues you've submitted, and resolve disputes for organizations you administer."
        />
        <DisputeSections />
      </main>
    </>
  );
}
