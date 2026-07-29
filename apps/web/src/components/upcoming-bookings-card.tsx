import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function UpcomingBookingsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming bookings</CardTitle>
        <CardDescription>
          Your confirmed resource reservations.
        </CardDescription>
        <CardAction>
          <Badge variant="secondary">0 upcoming</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="font-medium">No upcoming bookings</p>
        <p className="text-muted-foreground">
          Confirmed bookings will appear here with their date and time.
        </p>
      </CardContent>
    </Card>
  );
}
