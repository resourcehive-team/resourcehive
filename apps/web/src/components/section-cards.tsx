import { Badge } from "@/components/ui/badge";
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
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card>
        <CardHeader>
          <CardDescription>Points balance</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            100
          </CardTitle>
          <CardAction>
            <Badge variant="outline">Available</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Points can be used when booking a resource.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Upcoming bookings</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            0
          </CardTitle>
          <CardAction>
            <Badge variant="outline">None scheduled</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Your next confirmed booking will appear here.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Memberships</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            1
          </CardTitle>
          <CardAction>
            <Badge variant="outline">Approved</Badge>
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
          <CardTitle className="text-2xl font-semibold tabular-nums">
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
