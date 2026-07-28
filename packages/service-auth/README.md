# ResourceHive Service Authentication

## What this package is for

ResourceHive services need to know who is making a request.

Without this package, every developer would have to write JWT authentication
again inside the Resource, Booking, and Notification services. That would
create repeated code and could make each service behave differently.

`@resourcehive/service-auth` provides one shared way to authenticate requests.

Each service imports the package and uses it on routes that require a logged-in
user.

## The simple idea

```text
Identity Service
    creates a JWT when the user logs in

Client
    sends that JWT with a request

Resource, Booking, or Notification Service
    uses this package to verify the JWT
    identifies the user
    applies its own permission rules
```

The package works locally inside each service. It does not contact the Identity
Service for every request.

## What the package handles

- Finds the JWT in the request.
- Checks that the JWT was created using the ResourceHive secret.
- Checks that the JWT has not expired.
- Identifies the user from the JWT.
- Rejects missing, invalid, or expired tokens consistently.

## What the package does not handle

This package does not decide what a user is allowed to do.

Each service must still handle its own authorization rules.

Examples:

- Resource Service checks tenant membership and resource visibility.
- Booking Service checks resource access, availability, and points.
- Notification Service checks that a notification belongs to the user.

Remember:

```text
This package: Who is the user?
Your service: What is the user allowed to do?
```

## How a developer should use it

When adding a protected endpoint to a ResourceHive service:

1. Add `@resourcehive/service-auth` as a workspace dependency.
2. Import `ServiceAuthModule` into the service.
3. Protect the endpoint with `JwtAuthGuard`.
4. Use `CurrentUser` when the endpoint needs the authenticated user's ID.
5. Write the service's own authorization checks after authentication.
6. Keep health checks and other intentionally public endpoints unprotected.

You can ask your AI coding agent:

> Use `@resourcehive/service-auth` to authenticate this endpoint. Import
> `ServiceAuthModule`, protect the route with `JwtAuthGuard`, obtain the user
> with `CurrentUser`, and keep the service's authorization checks separate.

Do not ask the AI agent to create another JWT guard inside the service. The
shared package already provides it.

## What the service needs

The service must receive the same `JWT_SECRET` used by the Identity Service.

```env
JWT_SECRET=your-private-resourcehive-secret
```

Never commit the real secret to Git.

The client must send the JWT using:

```text
Authorization: Bearer <token>
```

## Small usage example

Import the shared module:

```ts
import { ServiceAuthModule } from "@resourcehive/service-auth";

@Module({
  imports: [ServiceAuthModule],
})
export class AppModule {}
```

Protect an endpoint and obtain the user:

```ts
@UseGuards(JwtAuthGuard)
@Get()
findAll(@CurrentUser() user: AuthenticatedUser) {
  return this.service.findAllowedForUser(user.userId);
}
```

The service must still check whether that user is allowed to see the requested
data.

## For the Identity Service developer

The Identity Service continues to own login, signup, passwords, and creating
JWTs.

This package is mainly for services that receive and verify those JWTs. It does
not replace the Identity Service.

## Before finishing a protected endpoint

Confirm that:

- the service imports `ServiceAuthModule`;
- the endpoint uses `JwtAuthGuard`;
- the user ID comes from `CurrentUser`, not the request body;
- the service performs its own authorization checks;
- the service has `JWT_SECRET` in its runtime environment;
- tests cover requests with and without a valid token.

## Testing this package

From the repository root:

```bash
pnpm --filter @resourcehive/service-auth run test
pnpm --filter @resourcehive/service-auth run lint
pnpm --filter @resourcehive/service-auth run build
```
