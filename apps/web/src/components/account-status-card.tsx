import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function AccountStatusCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account status</CardTitle>
        <CardDescription>
          A summary of your standard member account.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <span>Email verification</span>
          <Badge variant="secondary">Verified</Badge>
        </div>
        <Separator />
        <div className="flex items-center justify-between gap-4">
          <span>Account status</span>
          <Badge variant="secondary">Active</Badge>
        </div>
        <Separator />
        <div className="flex items-center justify-between gap-4">
          <span>Account type</span>
          <Badge variant="outline">Member</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
