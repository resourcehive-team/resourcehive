"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUserMemberships } from "@/lib/resource-service/membership-api";

export function MembershipsStatCard() {
  const [count, setCount] = React.useState<number | null>(null);
  const [error, setError] = React.useState<boolean>(false);

  React.useEffect(() => {
    const controller = new AbortController();

    getCurrentUserMemberships(controller.signal)
      .then((memberships) => {
        // Count approved memberships
        const approvedCount = memberships.filter(
          (m) => m.status.toUpperCase() === "APPROVED"
        ).length;
        setCount(approvedCount);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError(true);
        }
      });

    return () => controller.abort();
  }, []);

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardDescription className="text-destructive">Memberships</CardDescription>
          <CardTitle className="text-3xl font-medium tabular-nums text-destructive">
            —
          </CardTitle>
          <CardAction>
            <Badge variant="destructive">Error</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Unable to load memberships.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (count === null) {
    return (
      <Card aria-busy="true">
        <CardHeader>
          <CardDescription>Memberships</CardDescription>
          <CardTitle className="text-3xl font-medium tabular-nums">—</CardTitle>
          <CardAction>
            <Badge variant="outline">Loading</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Checking your memberships...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>Memberships</CardDescription>
        <CardTitle className="text-3xl font-medium tabular-nums">
          {count}
        </CardTitle>
        <CardAction>
          <Badge variant={count > 0 ? "success" : "secondary"}>
            {count > 0 ? "Approved" : "None"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Memberships control which resources you can access.
        </p>
      </CardContent>
    </Card>
  );
}
