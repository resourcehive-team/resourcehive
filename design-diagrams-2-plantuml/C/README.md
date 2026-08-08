# Person C — Architecture Diagram Insertion Guide

Use this guide only for the diagrams in this `C` folder.

For the Google Doc, use the SVG export with the same base filename when available. SVG stays clear when resized. The generated PNG previews are in `C/png`.

Insert every image **in line with text**, centre it, place its caption immediately below it, and then add the supplied description. Keep split figures together and in the stated order.

## Check of the current Word document

The images in `architecture doc resourcehive.docx` were checked on 8 August 2026.

- Figures 1, 2, and 3 are in the correct locations.
- Figures 6(a) and 6(b) are in the correct section, but they still need normal Word captions and descriptions after their embedded headings are cropped.
- Figure 7 currently appears twice. Keep `15-domain-class-booking` and remove the other Resource, Booking, Points, and Semester class diagram immediately after it. Then place the Figure 7 caption and description under `15-domain-class-booking`.
- The other team member's Rating, Dispute, and Notification diagram is correctly positioned as Figure 8 and must remain.
- Figures 9(a) and 9(b) are in the correct location. Replace their one combined caption with the two separate captions and descriptions below.
- All eight Data View diagrams are in the correct order and section. They still need the introductory text, captions, and descriptions below.
- The Notification/Rating and Dispute ERDs currently share one row. Either group them as required by the template or place them one below the other for easier reading.

The source filenames still contain the old numbers `20` and `21`. The captions below use Figures 24 and 25 because the latest document already uses Figures 20 and 21 in the Process View, Figure 22 in the Deployment View, and has an Implementation View diagram that should be Figure 23. If the team later renumbers earlier diagrams, change only the figure numbers, not the caption wording or descriptions.

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

The current Word document contains another Resource, Booking, Points, and Semester diagram directly after this image. It duplicates Figure 7. Remove that duplicate and keep the Figure 7 caption directly below `15-domain-class-booking`.

The following team-owned diagram shows ratings, disputes, and notifications. Keep it and use:

> Figure 8. Rating, Dispute, and Notification Domain Classes

Do not replace that team member's diagram with Figure 7.

### Figures 9(a) and 9(b) — Tenant Authorization

Find the existing combined caption:

> Figure 9. Tenant Boundary and Inherited Administration

The two images are already immediately above this caption. Delete the combined caption and place the following separate caption and description below each corresponding image. Keep both before the paragraph beginning `The Class Diagram illustrates`.

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

The blue Data View template paragraph has already been removed in the current Word document. Insert the following overview immediately below the heading and before the first ERD:

> ResourceHive stores identity, tenant, resource, booking, points-ledger, notification, rating, and dispute information in one shared PostgreSQL database managed through committed Prisma migrations. Tenant boundaries are represented by organization relationships and root organization identifiers. The following parts of Figure 24 divide the complete data model into smaller readable domain views; repeated entities are reference points connecting those views.

The images are already in the correct order. Add the following captions and descriptions beneath them.

### Figure 24(a) — Identity and Authentication Data

1. `20a-erd-identity-authentication.svg`
2. Caption:

> Figure 24(a). Identity and Authentication Data

3. Description:

> Figure 24(a) shows the User table and the email-verification, password-reset, refresh-token, and optional OAuth records belonging to a user.

### Figure 24(b) — Tenant and Membership Data

1. `20b-erd-tenant-membership.svg`
2. Caption:

> Figure 24(b). Tenant and Membership Data

3. Description:

> Figure 24(b) shows organization creation, parent and root relationships, user memberships, and membership approval. These relationships provide the main tenant and organization access structure.

### Figure 24(c) — Registration Access Data

1. `20c-erd-registration-access.svg`
2. Caption:

> Figure 24(c). Registration Access Data

3. Description:

> Figure 24(c) shows the root-organization email domains and organization email allowlist used during registration and membership processing. It also records the user who added each allowlist entry.

### Figure 24(d) — Resource, Booking, and Points Data

1. `20d-erd-resources-bookings-points.svg`
2. Caption:

> Figure 24(d). Resource, Booking, and Points Data

3. Description:

> Figure 24(d) connects organizations, resources, allowed organizations, availability slots, bookings, semesters, and point transactions. Composite tenant relationships prevent cross-tenant resource access, while booking and point-source relationships preserve transaction history.

### Figure 24(e) — Notification and Rating Data

1. `20e-erd-notifications-ratings.svg`
2. Caption:

> Figure 24(e). Notification and Rating Data

3. Description:

> Figure 24(e) shows recipient-scoped notifications and ratings submitted by users for resources after an eligible completed booking.

### Figure 24(f) — Booking Dispute Data

1. `20f-erd-disputes.svg`
2. Caption:

> Figure 24(f). Booking Dispute Data

3. Description:

> Figure 24(f) shows one optional dispute for a booking and the append-only event history recorded for that dispute. Users submit, review, and act in dispute events within the recorded root-organization scope.

Keep Figures 24(a) through 24(f) together. They are one divided ERD, not six unrelated data models.

### Figures 25(a) and 25(b) — Integrity and Concurrency

These two images are already immediately after Figure 24(f) and before:

> Size and Performance

Add the following caption and description below the first image:

1. `21a-booking-transaction-concurrency.svg`
2. Caption:

> Figure 25(a). Atomic Booking and Concurrency Handling

3. Description:

> Figure 25(a) follows the current Booking Service design. The service authenticates the user, validates membership, tenant, resource, slot, and point requirements, and then creates the booking inside one serializable Prisma transaction. A point deduction is appended in that transaction when the resource has a positive point cost. Serialization conflicts are retried, and all transaction writes commit or roll back together.

Add the following caption and description below the second image:

1. `21b-database-integrity-controls.svg`
2. Caption:

> Figure 25(b). PostgreSQL Integrity Controls

3. Description:

> Figure 25(b) groups the PostgreSQL constraints, indexes, and triggers that protect tenant relationships, organization hierarchy, resource-slot overlap, active-booking uniqueness, point-event uniqueness, append-only histories, timestamps, statuses, and cross-table relationships.

## Remaining blue template text

The current Word document contains four remaining blue template paragraphs. Delete each blue paragraph and paste the corresponding replacement below in normal black text.

### Section 8 — Implementation View introduction

Replace the blue paragraph immediately below `Implementation View` with:

> ResourceHive is implemented as a pnpm monorepo containing the authenticated Next.js application, an Nginx API Gateway, four independently runnable NestJS services, shared internal packages, and committed database migrations. The Identity, Resource, Booking, and Notification Services each own their domain rules. Shared packages provide the Prisma client and common JWT authentication without transferring domain ownership between services.

### Section 8.1 — Overview

Replace the blue paragraph immediately below `Overview` with:

> The implementation uses layered dependencies. Pages and components in `apps/web` call the frontend API client, which sends public API requests through Nginx. Nginx selects the responsible backend service but does not perform domain authorization. NestJS controllers validate incoming requests, shared guards authenticate protected requests, application services enforce tenant and business rules, and repositories access PostgreSQL through `@resourcehive/database`. The Prisma schema and committed SQL migrations under `db/schema` define the shared persistent model and its integrity controls.

The component diagram under `Layers` is already present. Add this caption and description below it:

> Figure 23. ResourceHive Implementation Layers

> Figure 23 shows the implementation dependency path from the Next.js presentation layer through the Nginx gateway and NestJS service layer to PostgreSQL. Services reuse the shared authentication and database packages, while the Prisma schema and migrations define the generated database client. The frontend does not access PostgreSQL directly, and Nginx does not contain service business rules.

### Section 10 — Size and Performance

Replace the blue paragraph below `Size and Performance` with:

> The initial deployment uses one instance of each backend service and one shared PostgreSQL database. No numerical production target for concurrent users, throughput, response time, or availability has yet been approved; these values must be established through load testing before production acceptance. Performance-sensitive request paths avoid an Identity Service network call by verifying JWTs locally, use indexed tenant-scoped database queries, paginate list responses, and limit booking locks to the state required for correctness. Booking correctness and tenant isolation must not be weakened to improve response time. Stateless access-token validation and replaceable service containers allow later horizontal scaling when measured demand justifies it.

### Section 11 — Quality

Replace the blue paragraph below `Quality` with:

> ResourceHive protects reliability and data correctness through committed migrations, PostgreSQL constraints, database transactions, controlled failure responses, health checks, and automated unit, service, database, and concurrent-booking tests. Security and privacy are supported by HTTPS, a single public API gateway, local JWT verification, service-local authorization, tenant-scoped queries, hashed passwords and tokens, secure cookies, and environment-based secret configuration. Clear service ownership, shared technical packages, documented APIs, and continuous integration improve maintainability. Provider-neutral PostgreSQL, email, hosting, and deployment configuration improves portability, while consistent shadcn-based interfaces, meaningful validation messages, semantic controls, and keyboard support improve usability and accessibility.

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
  Figure 24(a)
  Figure 24(b)
  Figure 24(c)
  Figure 24(d)
  Figure 24(e)
  Figure 24(f)
  Figure 25(a)
  Figure 25(b)
```

Figures 10 through 22 are already used by the Process and Deployment views. The Implementation View diagram should be Figure 23, which makes the Data View diagrams Figures 24 and 25. If another team member changes the preceding figure sequence, update the numbers consistently across captions and descriptions.
