import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { CurrentUserResponse } from "@/lib/auth-api";
import { formatOrganizationLabel } from "@/lib/resource-service/organization-format";

export function AccountStatusCard({
  account,
}: {
  account: CurrentUserResponse;
}) {
  const accountType =
    account.user.platformRole === "PLATFORM_ADMIN"
      ? "Platform administrator"
      : account.organizationContext.role
        ? formatOrganizationLabel(account.organizationContext.role)
        : "User";

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
          <Badge
            variant={account.user.emailVerified ? "success" : "destructive"}
          >
            {account.user.emailVerified ? "Verified" : "Not verified"}
          </Badge>
        </div>
        <Separator />
        <div className="flex items-center justify-between gap-4">
          <span>Account status</span>
          <Badge
            variant={
              account.user.status.toUpperCase() === "ACTIVE"
                ? "success"
                : "destructive"
            }
          >
            {formatOrganizationLabel(account.user.status)}
          </Badge>
        </div>
        <Separator />
        <div className="flex items-center justify-between gap-4">
          <span>Account type</span>
          <Badge variant="outline">{accountType}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
