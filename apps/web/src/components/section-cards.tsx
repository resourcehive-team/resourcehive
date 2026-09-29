import { Badge } from "@/components/ui/badge";
import { PointsBalanceCard } from "@/components/points-balance-card";
import { UpcomingBookingsStatCard } from "@/components/upcoming-bookings-stat-card";
import { MembershipsStatCard } from "@/components/memberships-stat-card";
import { NotificationsStatCard } from "@/components/notifications-stat-card";
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

      <MembershipsStatCard />

      <NotificationsStatCard />
    </div>
  );
}
