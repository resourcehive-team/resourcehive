import Link from "next/link";
import { RootOrganizationList } from "@/components/root-organization-list";
import { ScreenHeading } from "@/components/screen-heading";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export default function MembershipOnboardingPage() {
  return (
    <>
      <SiteHeader title="Choose your organization" />
      <main className="app-page @container/main">
        <ScreenHeading
          eyebrow="Welcome to ResourceHive"
          title="Request organization access"
          description="Your Google account is ready. Choose the organization that should review your membership request. Approval is required before organization-scoped actions become available."
          actions={<Button variant="outline" render={<Link href="/dashboard" />}>I’ll do this later</Button>}
        />
        <RootOrganizationList />
        <p className="mt-6 text-sm text-muted-foreground">
          After selecting an organization, follow its existing membership request flow. You can review the request from <Link className="underline underline-offset-4" href="/dashboard/account">Account → Membership</Link>.
        </p>
      </main>
    </>
  );
}
