import { Badge } from "@/components/ui/badge";
import { PointsBalanceCard } from "@/components/points-balance-card";
import { UpcomingBookingsStatCard } from "@/components/upcoming-bookings-stat-card";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SectionCards() {
  return (
    <div className="shared-panel-grid grid-cols-1 *:data-[slot=card]:border-0 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <PointsBalanceCard />

      <UpcomingBookingsStatCard />

      <Card>
        <CardHeader>
          <CardDescription>Memberships</CardDescription>
          <CardTitle className="text-3xl font-medium tabular-nums">
            1
          </CardTitle>
          <CardAction>
            <Badge variant="success">Approved</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Memberships control which resources you can access.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Unread notifications</CardDescription>
          <CardTitle className="text-3xl font-medium tabular-nums">
            0
          </CardTitle>
          <CardAction>
            <Badge variant="outline">Up to date</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Booking and membership updates will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
