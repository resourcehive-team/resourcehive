"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { connectGoogle, disconnectGoogle, getCurrentUser, requestPasswordSetup, type CurrentUserResponse } from "@/lib/auth-api";

export function SignInMethodsCard({ account, onAccountUpdated }: { account: CurrentUserResponse; onAccountUpdated: (account: CurrentUserResponse) => void }) {
  const methods = account.user.authenticationMethods ?? {
    password: true,
    google: { enabled: false, connected: false, email: null, connectedAt: null },
  };
  const [dialog, setDialog] = React.useState<"connect" | "disconnect" | null>(null);
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [feedback, setFeedback] = React.useState("");

  async function submitPasswordAction(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      if (dialog === "connect") {
        const result = await connectGoogle(password);
        window.location.assign(result.authorizationUrl);
        return;
      }
      await disconnectGoogle(password);
      onAccountUpdated(await getCurrentUser());
      setFeedback("Google has been disconnected.");
      setDialog(null);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update sign-in methods.");
    } finally { setBusy(false); setPassword(""); }
  }

  async function setupPassword() {
    setBusy(true); setError("");
    try { await requestPasswordSetup(); setFeedback("Check your email for a link to set your ResourceHive password."); }
    catch (actionError) { setError(actionError instanceof Error ? actionError.message : "Unable to send the password setup email."); }
    finally { setBusy(false); }
  }

  return <>
    <Card>
      <CardHeader>
        <CardTitle>Sign-in methods</CardTitle>
        <CardDescription>Manage the ways you access ResourceHive.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-start justify-between gap-4 border-b pb-4">
          <div><p className="font-medium">Password</p><p className="text-sm text-muted-foreground">{methods.password ? "Configured" : "Not configured"}</p></div>
          {methods.password ? <Badge variant="success">Configured</Badge> : <Button size="sm" variant="outline" onClick={setupPassword} disabled={busy}>Set password</Button>}
        </div>
        <div className="flex items-start justify-between gap-4">
          <div><p className="font-medium">Google</p><p className="text-sm text-muted-foreground">{methods.google.connected ? methods.google.email : methods.google.enabled ? "Not connected" : "Unavailable"}</p></div>
          {methods.google.connected ? <Badge variant="success">Connected</Badge> : methods.google.enabled ? <Button size="sm" variant="outline" onClick={() => { setError(""); setDialog("connect"); }}>Connect Google</Button> : <Badge variant="outline">Unavailable</Badge>}
        </div>
        {methods.google.connected && methods.password && <Button variant="destructive" className="w-fit" onClick={() => { setError(""); setDialog("disconnect"); }}>Disconnect Google</Button>}
        {methods.google.connected && !methods.password && <p className="text-sm text-muted-foreground">Set a password before disconnecting Google.</p>}
        {feedback && <p className="text-sm text-foreground" role="status">{feedback}</p>}
        {error && !dialog && <p className="text-sm text-destructive" role="alert">{error}</p>}
      </CardContent>
      <CardFooter><p className="text-xs text-muted-foreground">Organization access is controlled separately through membership approval.</p></CardFooter>
    </Card>
    <Dialog open={dialog !== null} onOpenChange={(open) => { if (!open) setDialog(null); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{dialog === "connect" ? "Connect Google" : "Disconnect Google"}</DialogTitle><DialogDescription>Confirm your ResourceHive password to continue.</DialogDescription></DialogHeader>
        <form onSubmit={submitPasswordAction} className="grid gap-4">
          <Field data-invalid={Boolean(error)}><FieldLabel htmlFor="google-action-password">Current password</FieldLabel><Input id="google-action-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /><FieldError>{error}</FieldError></Field>
          <DialogFooter><Button type="submit" disabled={busy}>{busy ? "Working…" : dialog === "connect" ? "Continue with Google" : "Disconnect"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
