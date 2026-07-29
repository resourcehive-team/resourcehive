import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function RecentActivityCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>
          Recent booking, points, and membership changes.
        </CardDescription>
        <CardAction>
          <Badge variant="secondary">No updates</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="font-medium">Nothing new yet</p>
        <p className="text-muted-foreground">
          Your latest ResourceHive activity will appear here.
        </p>
      </CardContent>
    </Card>
  );
}
