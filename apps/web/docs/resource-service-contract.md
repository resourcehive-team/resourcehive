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

The current response contains membership records with a nested user record.
The frontend must not integrate this response until the safety issues in the
readiness section are resolved.

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
