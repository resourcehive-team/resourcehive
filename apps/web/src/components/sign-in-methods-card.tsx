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
          <DialogFooter><Button type="submit" disabled={busy}>{busy ? "Working…" : dialog === "connect" ? <><svg className="mr-2 h-4 w-4" aria-hidden="true" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>Continue with Google</> : "Disconnect"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
