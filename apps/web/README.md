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

Use the domain API modules in `src/lib/resource-service` for Resource Service
requests. These modules already use the shared `apiRequest` client.

Before adding Resource Service calls, read
[`docs/resource-service-contract.md`](docs/resource-service-contract.md). It
records the current public paths, response shapes, and unresolved integration
blockers.

Do not write another authentication wrapper and do not try to read the JWT.
The JWT is stored in an HttpOnly cookie, so browser JavaScript cannot access
it. The shared client tells the browser to send the cookie automatically.

Example organization request:

```ts
import { getRootOrganizations } from
  "@/lib/resource-service/organization-api";

const organizations = await getRootOrganizations();
```

Example membership request:

```ts
import { requestOrganizationMembership } from
  "@/lib/resource-service/membership-api";

await requestOrganizationMembership(organizationId);
```

Example resource catalogue request:

```ts
import { getAccessibleResources } from
  "@/lib/resource-service/resource-api";

const resources = await getAccessibleResources(organizationId, {
  page: 1,
  limit: 10,
  search: "laboratory",
});
```

The resource catalogue is available at `/dashboard/resources`. It:

- offers organizations from the current user's approved memberships;
- asks the Resource Service to authorize every selected organization;
- searches only by resource name;
- requests ten resources per page;
- displays owned and shared resources without inventing owner names;
- handles loading, empty, authorization, network, and pagination states.

The Resource Service modules:

- use the public API gateway;
- use the shared authenticated browser client;
- define the current response types in `resource-service/types.ts`;
- safely encode organization and resource IDs;
- support only the filters the backend currently provides;
- accept an optional `AbortSignal` so screens can cancel stale requests.

The membership module also provides the administrator-only organization-member
list. Its response contains an explicit safe user summary and does not include
password hashes. The Resource Service remains responsible for verifying
administrator access.

The underlying shared client:

- sends requests through the API gateway;
- includes the authentication cookie;
- sends JSON correctly;
- handles empty responses;
- produces consistent network and API errors;
- reports an expired session with `ApiAuthenticationError`;
- prevents requests to arbitrary external URLs.

Future Booking and Notification modules should follow the same pattern and
call `apiRequest` instead of calling `fetch` directly.

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
