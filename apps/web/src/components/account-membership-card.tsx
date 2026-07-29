import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function AccountMembershipCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization membership</CardTitle>
        <CardDescription>
          The organizations that give you access to shared resources.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">Primary organization</p>
            <p className="text-muted-foreground">
              Your approved organization will appear here.
            </p>
          </div>
          <Badge variant="secondary">Member</Badge>
        </div>
        <Separator />
        <p className="text-muted-foreground">
          Memberships determine which resources you can view and book.
        </p>
      </CardContent>
    </Card>
  );
}
