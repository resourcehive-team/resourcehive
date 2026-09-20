import { ShieldIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function PlatformAnalyticsPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <ShieldIcon className="mb-2 size-6 text-clay" />
        <CardTitle>Platform-wide analytics</CardTitle>
        <CardAction>
          <Badge variant="outline">Coming soon</Badge>
        </CardAction>
        <CardDescription>
          Cross-tenant analytics for platform administrators — total
          organizations, tenant-wide utilization, and adoption trends — are
          planned for a later release once platform-admin authorization is
          wired into this service.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
