import { CurrentMembershipList } from "@/components/current-membership-list";
import { SiteHeader } from "@/components/site-header";

export default function MembershipsPage() {
  return (
    <>
      <SiteHeader title="My memberships" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-6 px-4 py-4 lg:px-6 lg:py-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">
                My memberships
              </h2>
              <p className="text-muted-foreground">
                View your organization memberships and pending requests.
              </p>
            </div>
            <CurrentMembershipList />
          </div>
        </div>
      </div>
    </>
  );
}
