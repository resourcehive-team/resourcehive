# Person C — Architecture Diagram Insertion Guide

Use this guide only for the diagrams in this `C` folder.

For the Google Doc, use the SVG export with the same base filename when available. SVG stays clear when resized. The generated PNG previews are in `C/png`.

Insert every image **in line with text**, centre it, place its caption immediately below it, and then add the supplied description. Keep split figures together and in the stated order.

## Section 2 — Architectural Representation

Find the actual heading:

> Architectural Goals and Constraints

Insert Figures 1 and 2 immediately before that heading, at the end of Section 2.

### Figure 1 — System Context

Insert:

1. `01-system-context.svg`
2. Caption:

> Figure 1. ResourceHive System Context

3. Description:

> Figure 1 shows ResourceHive as a multi-tenant platform and identifies the people and external systems that interact with it. Visitors, members, organization administrators, platform administrators, and system operators use the platform. Email, optional OAuth, PostgreSQL, and public DNS and HTTPS infrastructure remain outside the ResourceHive system boundary.

### Figure 2 — Container and Service Architecture

Insert this immediately after the Figure 1 description:

1. `02-container-architecture.svg`
2. Caption:

> Figure 2. ResourceHive Container and Service Architecture

3. Description:

> Figure 2 shows the main ResourceHive runtime containers. The public marketing website links to the authenticated Next.js application. Application requests pass through the Nginx API Gateway to the Identity, Resource, Booking, or Notification Service. Nginx only routes requests; protected services verify the JWT locally and perform their own authorization checks. All four services use the shared PostgreSQL database, while the Identity Service sends verification email through the configured email provider.

## Section 4 — Use-Case View

Search for the existing caption:

> Figure 01. Identity and Tenant Onboarding Use Cases

If the picture is already present, replace that picture with the new Diagram 03 image. Do not add a duplicate.

Use:

1. `03-identity-use-cases.svg`
2. Caption:

> Figure 3. Identity and Tenant Onboarding Use Cases

3. Description:

> Figure 3 summarizes identity and tenant-onboarding use cases. Visitors register, registered users verify their email, log in, or reset their password, and authenticated members refresh or end their session. Platform administrators create root tenants, assign initial administrators, and suspend tenants or users. OAuth account linking is shown as an optional approved integration.

The organization/resource and booking use-case diagrams owned by other team members should follow this as Figures 4 and 5.

## Section 5 — Logical View

Find this sentence near the end of the Notification Package description:

> Persists recipient-scoped alerts and tracks read statuses

Finish the Notification Package description first. The following class diagrams are **not** part of the Notification Package alone.

After the four package descriptions, add this small heading:

> Domain Class Diagrams

Then insert Figures 6(a), 6(b), and 7 in order.

### Figure 6(a) — Identity and Authentication Classes

Insert:

1. `14a-domain-class-identity-authentication.svg`
2. Caption:

> Figure 6(a). Identity and Authentication Domain Classes

3. Description:

> Figure 6(a) shows the global User identity and its authentication records. Email verification and password reset tokens are time-limited and single-use. Refresh tokens represent renewable sessions, while OAuthAccount stores an optional approved provider link.

### Figure 6(b) — Tenant and Membership Classes

Insert immediately after Figure 6(a):

1. `14b-domain-class-tenant-membership.svg`
2. Caption:

> Figure 6(b). Tenant and Membership Domain Classes

3. Description:

> Figure 6(b) shows how users join organizations through memberships. Organizations use parentId to form a hierarchy and rootOrganizationId to identify the tenant boundary. Email domains and allowlist records control registration and membership access, while joinBonusPoints stores the points granted by an organization.

Figures 6(a) and 6(b) together replace the old combined Diagram 14.

### Figure 7 — Resource, Booking, and Points Classes

Insert immediately after Figure 6(b):

1. `15-domain-class-booking.svg`
2. Caption:

> Figure 7. Resource, Booking, Points, and Semester Domain Classes

3. Description:

> Figure 7 connects organization-owned resources to allowed organizations, availability slots, and user bookings. PointTransaction is the append-only points ledger used for booking deductions, refunds, joining bonuses, and semester allocations. Booking and point changes are performed together when a booking is created.

The document currently contains another class diagram with an incorrect Figure 7 caption. If that image shows ratings, disputes, and notifications, change its caption to:

> Figure 8. Rating, Dispute, and Notification Domain Classes

Do not replace that team member's diagram with Figure 7.

### Figures 9(a) and 9(b) — Tenant Authorization

Find the actual Section 6 heading:

> Process View

Insert both parts of Figure 9 immediately before that heading. They should be the final diagrams in Section 5.

First insert:

1. `17a-tenant-boundaries.svg`
2. Caption:

> Figure 9(a). Root Tenant and Organization Boundaries

3. Description:

> Figure 9(a) shows two independent root tenants and their child organizations. Every parent-child relationship must remain inside one root_organization_id. The database rejects organization relationships that cross a tenant boundary.

Immediately after it insert:

1. `17b-inherited-administration.svg`
2. Caption:

> Figure 9(b). Inherited Organization Administration

3. Description:

> Figure 9(b) shows the authorization example used by ResourceHive. A user with an approved ADMIN membership in Faculty A1 can manage Faculty A1 and its child Department A1.1. The user cannot manage an ancestor, an unrelated branch, or an organization in another root tenant.

## Section 9 — Data View

Find the actual heading:

> Data View (optional)

Delete the blue template paragraph beginning with:

> [A description of the persistent data storage perspective

Replace it with:

> ResourceHive stores identity, tenant, resource, booking, points-ledger, notification, rating, and dispute information in one shared PostgreSQL database managed through committed Prisma migrations. Tenant boundaries are represented by organization relationships and root organization identifiers. The following parts of Figure 20 divide the complete data model into smaller readable domain views; repeated entities are reference points connecting those views.

Insert all six parts of Figure 20 in the following order.

### Figure 20(a) — Identity and Authentication Data

1. `20a-erd-identity-authentication.svg`
2. Caption:

> Figure 20(a). Identity and Authentication Data

3. Description:

> Figure 20(a) shows the User table and the email-verification, password-reset, refresh-token, and optional OAuth records belonging to a user.

### Figure 20(b) — Tenant and Membership Data

1. `20b-erd-tenant-membership.svg`
2. Caption:

> Figure 20(b). Tenant and Membership Data

3. Description:

> Figure 20(b) shows organization creation, parent and root relationships, user memberships, and membership approval. These relationships provide the main tenant and organization access structure.

### Figure 20(c) — Registration Access Data

1. `20c-erd-registration-access.svg`
2. Caption:

> Figure 20(c). Registration Access Data

3. Description:

> Figure 20(c) shows the root-organization email domains and organization email allowlist used during registration and membership processing. It also records the user who added each allowlist entry.

### Figure 20(d) — Resource, Booking, and Points Data

1. `20d-erd-resources-bookings-points.svg`
2. Caption:

> Figure 20(d). Resource, Booking, and Points Data

3. Description:

> Figure 20(d) connects organizations, resources, allowed organizations, availability slots, bookings, semesters, and point transactions. Composite tenant relationships prevent cross-tenant resource access, while booking and point-source relationships preserve transaction history.

### Figure 20(e) — Notification and Rating Data

1. `20e-erd-notifications-ratings.svg`
2. Caption:

> Figure 20(e). Notification and Rating Data

3. Description:

> Figure 20(e) shows recipient-scoped notifications and ratings submitted by users for resources after an eligible completed booking.

### Figure 20(f) — Booking Dispute Data

1. `20f-erd-disputes.svg`
2. Caption:

> Figure 20(f). Booking Dispute Data

3. Description:

> Figure 20(f) shows one optional dispute for a booking and the append-only event history recorded for that dispute. Users submit, review, and act in dispute events within the recorded root-organization scope.

Keep Figures 20(a) through 20(f) together. They are one divided ERD, not six unrelated data models.

### Figures 21(a) and 21(b) — Integrity and Concurrency

Insert these immediately after Figure 20(f) and before:

> Size and Performance

First insert:

1. `21a-booking-transaction-concurrency.svg`
2. Caption:

> Figure 21(a). Atomic Booking and Concurrency Handling

3. Description:

> Figure 21(a) follows the current Booking Service design. The service authenticates the user, validates membership, tenant, resource, slot, and point requirements, and then creates the booking inside one serializable Prisma transaction. A point deduction is appended in that transaction when the resource has a positive point cost. Serialization conflicts are retried, and all transaction writes commit or roll back together.

Immediately after it insert:

1. `21b-database-integrity-controls.svg`
2. Caption:

> Figure 21(b). PostgreSQL Integrity Controls

3. Description:

> Figure 21(b) groups the PostgreSQL constraints, indexes, and triggers that protect tenant relationships, organization hierarchy, resource-slot overlap, active-booking uniqueness, point-event uniqueness, append-only histories, timestamps, statuses, and cross-table relationships.

## Final Order of Person C Diagrams

```text
Section 2
  Figure 1
  Figure 2

Section 4
  Figure 3
  Figure 4 (other team member)
  Figure 5 (other team member)

Section 5
  Figure 6(a)
  Figure 6(b)
  Figure 7
  Figure 8 (other team member)
  Figure 9(a)
  Figure 9(b)

Section 9
  Figure 20(a)
  Figure 20(b)
  Figure 20(c)
  Figure 20(d)
  Figure 20(e)
  Figure 20(f)
  Figure 21(a)
  Figure 21(b)
```

Do not renumber the later figures because Figures 10 through 19 belong to the Process, Deployment, and Implementation views prepared elsewhere in the architecture document.
