import { LogoutButton } from "@/components/logout-button";
import { ProtectedRoute } from "@/components/protected-route";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <main className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard</CardTitle>
              <CardDescription>
                You are signed in to ResourceHive.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <p>
                Resource and organization tools will appear here as they are
                added.
              </p>
              <LogoutButton />
            </CardContent>
          </Card>
        </div>
      </main>
    </ProtectedRoute>
  );
}
