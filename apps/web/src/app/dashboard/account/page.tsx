import { AccountDetails } from "@/components/account-details";
import { CurrentMembershipList } from "@/components/current-membership-list";
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
              <AccountDetails />
            </TabsContent>

            <TabsContent value="membership">
              <CurrentMembershipList />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
