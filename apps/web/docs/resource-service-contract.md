# Resource Service Frontend Contract Review

## Purpose

This document records the Resource Service HTTP contract that currently exists
for the Week 4 frontend work.

It is based on the merged Resource Service controllers, services, DTOs, tests,
database schema, and Nginx routes. It does not propose new endpoints or change
Person A's service.

The frontend must use the public API gateway:

```text
Browser → http://localhost:8000 → Nginx → Resource Service
```

The frontend must not call the private Resource Service container or port
directly.

## Public route prefixes

Nginx forwards these prefixes to the Resource Service:

| Public prefix | Domain |
| --- | --- |
| `/organizations/` | Organizations |
| `/memberships/` | Memberships |
| `/resources/` | Resources |

Every endpoint described below currently requires authentication.

## Shared response fields

The service currently returns Prisma records directly. Dates therefore arrive
as ISO date strings in JSON.

The database stores roles, statuses, and organization types as strings. The
frontend should display known values but must safely handle an unknown value.

### Organization

```ts
interface Organization {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
  rootOrganizationId: string;
  joinBonusPoints: number;
  status: string;
  createdBy: string;
  createdAt: string;
}
```

Organization details also include:

```ts
interface OrganizationDetails extends Organization {
  children: Organization[];
}
```

### Membership

```ts
interface Membership {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  status: string;
  joinedAt: string;
  approvedBy: string | null;
}
```

The current-user membership endpoint adds the complete organization record:

```ts
interface MembershipWithOrganization extends Membership {
  organization: Organization;
}
```

### Resource

```ts
interface AllowedOrganization {
  resourceId: string;
  organizationId: string;
  rootOrganizationId: string;
}

interface Resource {
  id: string;
  name: string;
  description: string | null;
  ownerOrganizationId: string;
  rootOrganizationId: string;
  createdByUserId: string;
  status: string;
  pointCost: number;
  createdAt: string;
  allowedOrganizations: AllowedOrganization[];
}
```

The resource details endpoint also includes the owner organization:

```ts
interface ResourceDetails extends Resource {
  ownerOrganization: Organization;
}
```

## Organization endpoints

### List root organizations

```http
GET /organizations/roots
```

Response:

```ts
Organization[]
```

Current behavior:

- Returns organizations whose `parentId` is `null`.
- Has no pagination or filtering.
- Has no guaranteed ordering.
- Is available to any authenticated user.

### Get organization details

```http
GET /organizations/:id
```

Response:

```ts
OrganizationDetails | null
```

Current behavior:

- Includes the organization's direct children.
- Returns `null` when the organization is not found.
- Is available to any authenticated user.

### List organizations under a root

```http
GET /organizations/:id/children
```

Response:

```ts
Organization[]
```

Current behavior:

- Treats `:id` as a root organization ID.
- Returns every non-root organization under that root.
- Does not return only the immediate children.
- Has no pagination, filtering, or guaranteed ordering.

For an organization details screen, `GET /organizations/:id` is the reliable
source for its direct children.

## Membership endpoints

### Request membership

```http
POST /memberships/:organizationId/request
```

Request body:

```text
No body
```

Successful response:

```ts
Membership
```

Current behavior:

- Creates a `MEMBER` membership with `PENDING` status.
- Gets the user ID from authenticated request identity.
- Returns `409 Conflict` when a membership record already exists.

The frontend must never send a user ID, role, or tenant value for this request.

### List the current user's memberships

```http
GET /memberships/my-memberships
```

Response:

```ts
MembershipWithOrganization[]
```

Current behavior:

- Gets the user ID from authenticated request identity.
- Returns all membership statuses.
- Has no pagination or filtering.

### List an organization's members

```http
GET /memberships/organization/:organizationId
```

Response:

```ts
interface OrganizationMember {
  userId: string;
  organizationId: string;
  role: string;
  status: string;
  joinedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
  };
}
```

Current behavior:

- Requires administrator access through `TenantGuard` and `AdminGuard`.
- Returns membership records for the requested organization.
- Includes only the safe user fields shown above.
- Never returns password hashes.
- Has no pagination, filtering, or guaranteed ordering.

## Resource catalogue endpoints

### List accessible resources

```http
GET /resources/organization/:organizationId
```

Supported query parameters:

| Parameter | Type | Default | Current meaning |
| --- | --- | --- | --- |
| `page` | integer | `1` | Requested page |
| `limit` | integer | `10` | Records per page |
| `search` | string | none | Case-insensitive resource-name search |

No status, type, cost, owner, or allowed-organization filter currently exists.
The frontend must not invent those filters.

Response:

```ts
interface PaginatedResources {
  data: Resource[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

Current behavior:

- Requires an approved membership in `:organizationId`.
- Returns resources owned by that organization.
- Also returns resources explicitly allowed for that organization.
- Sorts by `createdAt` descending.
- Searches only the resource name.

The organization ID remains untrusted input. The Resource Service must continue
checking it against the authenticated user's approved memberships.

### Get resource details

```http
GET /resources/organization/:organizationId/:resourceId
```

Response:

```ts
ResourceDetails
```

Current behavior:

- Requires an approved membership in `:organizationId`.
- Returns the resource only when the organization owns it or is explicitly
  allowed to use it.
- Returns `403 Forbidden` when the organization cannot access the resource.
- Returns `404 Not Found` when the resource does not exist.

## Admin endpoints outside the current frontend scope

The service also contains endpoints for:

- approving and rejecting memberships;
- creating, updating, and archiving resources;
- managing root-organization email domains;
- managing organization email allowlists.

Those operations are not required by the current Week 4 regular-member
frontend. They should not be added to the UI as part of issue #32.

## Integration readiness

The endpoint paths are known, but the current service is **not ready for the
browser integration required by issue #32**.

The following items must be resolved or explicitly agreed before the later
frontend API and screen branches are considered complete.

### 1. Browser authentication is incompatible

The shared frontend `apiRequest` client sends the ResourceHive HttpOnly cookie.
The Resource Service currently reads only:

```http
Authorization: Bearer <token>
```

Browser JavaScript cannot read the HttpOnly cookie to create that header.
Therefore, protected Resource Service requests from the current web
application will receive `401 Unauthorized`.

The Resource Service owner should migrate the service to
`@resourcehive/service-auth`, which already accepts the ResourceHive cookie and
bearer tokens. The frontend must not restore local-storage tokens or implement
another authentication method.

### 2. The local gateway browser CORS contract is missing

The current frontend and gateway use different local origins:

```text
Frontend: http://localhost:3000
Gateway:  http://localhost:8000
```

The Nginx gateway does not currently add CORS response headers, and the
Resource Service does not enable CORS. Browser requests to the public gateway
will therefore require one agreed solution:

- configure CORS once at the public gateway; or
- expose the gateway through the same public origin as the frontend.

This is gateway/deployment integration work. It should not be reimplemented
inside every frontend API function.

### 3. Organization member response safety is resolved

The endpoint now selects only user ID, first name, last name, email, and
account status. Full database user records and password hashes are not
returned.

### 4. Organization member authorization is resolved

The endpoint now uses both `TenantGuard` and `AdminGuard`. The frontend still
handles `403 Forbidden`, and it does not treat a hidden or visible navigation
link as an authorization decision.

### 5. Request validation is not active

The Resource Service DTOs contain `class-validator` decorators, but the
application does not install a global `ValidationPipe`. The decorators do not
currently create a reliable HTTP validation contract.

The service should enable validation and publish stable `400 Bad Request`
responses before the frontend builds forms for resource administration. The
Week 4 regular-member screens should still validate their own query and form
inputs for user experience, but client validation cannot replace server
validation.

### 6. Pagination limits are not bounded

`page` and `limit` are parsed as integers, but the service does not currently
enforce:

- `page >= 1`;
- `limit >= 1`;
- a maximum allowed `limit`.

The frontend should initially use `page >= 1` and `limit = 10`, but the service
should publish and enforce an approved maximum before the pagination contract
is treated as final.

### 7. Archived resources are included

The resource catalogue query does not filter by resource status. Archived
resources can therefore appear in the regular-member catalogue.

The service owner should confirm whether the member catalogue returns only
`ACTIVE` resources or whether status must be an explicit supported filter.
The frontend should not guess this behavior.

### 8. Response schemas are implicit

Swagger documents endpoint names and request DTOs, but the controllers do not
declare explicit response DTOs. The response shapes currently depend on raw
Prisma query results.

The TypeScript shapes in this review describe the current implementation, but
they are not yet a versioned public contract. Backend changes to Prisma
`include` or `select` clauses could otherwise break the frontend silently.

### 9. Organization child semantics need stable naming

`GET /organizations/:id/children` is described as a child endpoint, but its
implementation returns all non-root descendants for a root ID.

For Week 4:

- use `GET /organizations/:id` for direct children;
- treat `/organizations/:id/children` as a root-descendant endpoint;
- do not build a nested hierarchy from it until the backend contract is
  clarified.

### 10. Catalogue items do not include the owner name

The paginated resource list contains `ownerOrganizationId` but not the owner
organization record. A catalogue that displays owner names must either:

- use organization data already loaded by the page; or
- receive an agreed safe owner summary from the Resource Service.

The frontend should not perform one extra organization request for every
resource card.

## Recommended next-step boundary

The typed frontend API modules and catalogue screen now exist. Live
end-to-end requests still depend on the unresolved infrastructure items below:

1. Resource Service accepts the shared HttpOnly cookie authentication.
2. The public gateway browser-origin strategy is confirmed.
3. Safe organization-member authorization and response fields are implemented.
4. Pagination, resource status behavior, and response shapes are confirmed.
5. Person C connects the screens to the prepared modules after the required
   backend contracts are safe. The current organization, membership, and
   catalogue screens are implemented with explicit failure states.

The frontend should not work around an unsafe or incomplete backend contract.

The prepared modules include the reviewed organization, current-user
membership, membership-request, administrator member-list, resource-list, and
resource-details operations.

## Frontend contract rules

Future frontend API modules must:

- call these paths through the Nginx gateway;
- use the shared `apiRequest` browser client;
- let the browser send the HttpOnly authentication cookie;
- take the current user from authenticated server responses;
- never send a user role as an authorization decision;
- never assume a selected organization proves membership;
- handle unknown string statuses safely;
- implement only `page`, `limit`, and `search` for the current catalogue;
- treat `401`, `403`, `404`, `409`, validation errors, and network failures as
  separate user-facing states.
