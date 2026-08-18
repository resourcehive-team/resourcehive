import { AccountDetails } from "@/components/account-details";
import { CurrentMembershipList } from "@/components/current-membership-list";
import { ScreenHeading } from "@/components/screen-heading";
import { SiteHeader } from "@/components/site-header";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function AccountPage() {
  return (
    <>
      <SiteHeader title="Account" />
      <main className="app-page @container/main">
        <ScreenHeading
          eyebrow="Personal settings"
          title="Your account"
          description="Review your profile, account state, and organization memberships."
        />
        <Tabs defaultValue="profile" className="gap-6">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="membership">Membership</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="grid gap-6 lg:grid-cols-2">
            <AccountDetails />
          </TabsContent>

          <TabsContent value="membership">
            <CurrentMembershipList />
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
