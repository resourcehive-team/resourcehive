import { AccountProfileCard } from "@/components/account-profile-card";
import { AccountStatusCard } from "@/components/account-status-card";
import { SiteHeader } from "@/components/site-header";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
              <Card>
                <CardHeader>
                  <CardTitle>Membership</CardTitle>
                  <CardDescription>
                    Your organization access and membership status.
                  </CardDescription>
                </CardHeader>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
