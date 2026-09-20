import Link from "next/link";
import { ShieldCheckIcon } from "lucide-react";

import { MyDisputes } from "@/components/my-disputes";
import { ScreenHeading } from "@/components/screen-heading";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export default function DisputesPage() {
  return (
    <>
      <SiteHeader title="Disputes" />
      <main className="app-page @container/main">
        <ScreenHeading
          eyebrow="Booking issues"
          title="Disputes"
          description="Report a resource that was not returned, damaged, or misplaced, and track the review of issues you have submitted."
          actions={
            <Button
              variant="outline"
              render={<Link href="/dashboard/disputes/org" />}
            >
              <ShieldCheckIcon data-icon="inline-start" />
              Review organization disputes
            </Button>
          }
        />
        <MyDisputes />
      </main>
    </>
  );
}
