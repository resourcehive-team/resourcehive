"use client";

import * as React from "react";

import { RootOrganizationList } from "@/components/root-organization-list";
import { useDashboardCurrentUser } from "@/components/dashboard-current-user";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPlatformUniversity } from "@/lib/auth-api";

export function OrganizationsPageContent() {
  const { state } = useDashboardCurrentUser();

  if (
    state.status === "loaded" &&
    state.account.user.platformRole === "PLATFORM_ADMIN"
  ) {
    return <CreateUniversityForm />;
  }

  return <RootOrganizationList />;
}

function CreateUniversityForm() {
  const [name, setName] = React.useState("");
  const [adminEmail, setAdminEmail] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [created, setCreated] = React.useState<{
    name: string;
    email: string;
  } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setCreated(null);

    try {
      const result = await createPlatformUniversity(name.trim(), adminEmail.trim());
      setCreated({
        name: result.university.name,
        email: result.administrator.email,
      });
      setName("");
      setAdminEmail("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create the university. Try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Create a university</CardTitle>
        <CardDescription>
          Assign an active, verified ResourceHive account as its first administrator.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="university-name">University name</Label>
            <Input
              id="university-name"
              autoComplete="organization"
              maxLength={200}
              required
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="university-admin-email">Admin email</Label>
            <Input
              id="university-admin-email"
              type="email"
              autoComplete="email"
              maxLength={320}
              required
              value={adminEmail}
              onChange={(event) => setAdminEmail(event.currentTarget.value)}
            />
          </div>
          <div>
            <Button type="submit" disabled={saving || !name.trim() || !adminEmail.trim()}>
              {saving ? "Creating…" : "Create university"}
            </Button>
          </div>
        </form>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {created && (
          <p className="text-sm text-foreground" role="status">
            {created.name} was created. {created.email} is its university admin.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
