# ResourceHive Web Application

This is the ResourceHive application frontend. It is built with Next.js and
uses the ResourceHive API gateway to reach the Resource, Booking, and
Notification services.

## Run the frontend

From the repository root:

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
pnpm run dev:web
```

Open <http://localhost:3000>.

The Identity Service and API gateway must also be running when the frontend
needs backend data.

## Frontend environment

The example environment contains two public backend URLs:

```env
NEXT_PUBLIC_IDENTITY_API_URL=http://localhost:3001
NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:8000
```

- `NEXT_PUBLIC_IDENTITY_API_URL` is used for signup, verification, login,
  logout, and the current-user request.
- `NEXT_PUBLIC_API_GATEWAY_URL` is used for Resource, Booking, and Notification
  requests.

These URLs are public configuration, not secrets.

`JWT_SECRET` is server-only. It must use the same value as the Identity
Service so the Next.js proxy can protect frontend routes. Never prefix this
secret with `NEXT_PUBLIC_`.

## Authenticated service requests

Use `apiRequest` from `src/lib/api-client.ts` for protected Resource, Booking,
and Notification requests.

Do not write another authentication wrapper and do not try to read the JWT.
The JWT is stored in an HttpOnly cookie, so browser JavaScript cannot access
it. The shared client tells the browser to send the cookie automatically.

Example GET request:

```ts
import { apiRequest } from "@/lib/api-client";

const organizations = await apiRequest<Organization[]>("/organizations");
```

Example POST request:

```ts
await apiRequest("/memberships", {
  method: "POST",
  json: {
    organizationId,
  },
});
```

The shared client:

- sends requests through the API gateway;
- includes the authentication cookie;
- sends JSON correctly;
- handles empty responses;
- produces consistent network and API errors;
- reports an expired session with `ApiAuthenticationError`;
- prevents requests to arbitrary external URLs.

Each domain should place its endpoint functions in a small file such as
`resource-api.ts`, `booking-api.ts`, or `notification-api.ts`. Those functions
should call `apiRequest` instead of calling `fetch` directly.

Identity operations remain in `src/lib/auth-api.ts`.

## Handling an expired session

If a protected request throws `ApiAuthenticationError`, send the user to the
login page. The client does not perform navigation itself because each screen
must decide how to handle losing its session.

```ts
try {
  const bookings = await apiRequest<Booking[]>("/bookings");
} catch (error) {
  if (error instanceof ApiAuthenticationError) {
    router.replace("/login");
  }
}
```

## Checks

From the repository root:

```bash
pnpm --filter frontend run lint
pnpm --filter frontend run build
```
