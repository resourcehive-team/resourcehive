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
import {
  getCurrentUserPoints,
  type CurrentUserPointsResponse,
} from "@/lib/auth-api";

type BalanceState =
  | { status: "loading" }
  | { status: "loaded"; balance: CurrentUserPointsResponse }
  | { status: "error" };

export function PointsBalanceCard() {
  const [state, setState] = React.useState<BalanceState>({
    status: "loading",
  });

  React.useEffect(() => {
    const controller = new AbortController();

    getCurrentUserPoints(controller.signal)
      .then((balance) => {
        setState({ status: "loaded", balance });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ status: "error" });
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <Card aria-busy={state.status === "loading"}>
      <CardHeader>
        <CardDescription>Points balance</CardDescription>
        <CardTitle
          aria-live="polite"
          className="text-3xl font-medium tabular-nums"
        >
          {balanceLabel(state)}
        </CardTitle>
        <CardAction>
          <BalanceBadge state={state} />
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{balanceDescription(state)}</p>
      </CardContent>
    </Card>
  );
}

function BalanceBadge({ state }: { state: BalanceState }) {
  if (state.status === "loading") {
    return <Badge variant="outline">Loading</Badge>;
  }

  if (state.status === "error") {
    return <Badge variant="destructive">Unavailable</Badge>;
  }

  return <Badge variant="success">Available</Badge>;
}

function balanceLabel(state: BalanceState): string {
  if (state.status === "loaded") {
    return new Intl.NumberFormat().format(state.balance.availablePoints);
  }

  return "—";
}

function balanceDescription(state: BalanceState): string {
  if (state.status === "error") {
    return "Your current balance could not be loaded. Refresh to try again.";
  }

  if (state.status === "loaded" && state.balance.updatedAt === null) {
    return "No points have been issued to this account yet.";
  }

  return "Points can be used when booking a resource.";
}
