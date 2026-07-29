import { AccountMembershipCard } from "@/components/account-membership-card";
import { AccountProfileCard } from "@/components/account-profile-card";
import { AccountStatusCard } from "@/components/account-status-card";
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
      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-4 p-4 lg:p-6">
          <Tabs defaultValue="profile">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="membership">Membership</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="grid gap-4">
              <AccountProfileCard />
              <AccountStatusCard />
            </TabsContent>

            <TabsContent value="membership">
              <AccountMembershipCard />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
