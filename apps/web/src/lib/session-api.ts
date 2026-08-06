import { apiUrl } from "@/lib/config";

let activeRefreshRequest: Promise<boolean> | null = null;

export function refreshSession(): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }

  if (!activeRefreshRequest) {
    activeRefreshRequest = performRefresh().finally(() => {
      activeRefreshRequest = null;
    });
  }

  return activeRefreshRequest;
}

export async function fetchWithSessionRefresh(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status !== 401 || !(await refreshSession())) {
    return response;
  }

  return fetch(input, init);
}

async function performRefresh(): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}
