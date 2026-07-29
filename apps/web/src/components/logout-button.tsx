"use client";

import { Button } from "@/components/ui/button";
import { clearAccessToken } from "@/lib/auth-storage";

export function LogoutButton() {
  return (
    <Button variant="outline" onClick={clearAccessToken}>
      Log out
    </Button>
  );
}
