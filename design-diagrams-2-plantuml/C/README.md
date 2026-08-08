### Diagram 01 — System Context

Search for:

> Architectural Goals and Constraints

Click immediately before that heading. This is the end of Section 2, “Architectural Representation.”

Insert:

1. 01-system-context.svg
2. Caption:

> Figure 1. ResourceHive System Context

3. Description:

> Figure 1 presents ResourceHive as a multi-tenant platform and identifies the users and external systems that interact with it.
> Visitors, members, organization administrators, platform administrators, and system operators interact with the platform, while
> email, OAuth, PostgreSQL, DNS, and HTTPS infrastructure remain outside the system boundary.

———

### Diagram 02 — Container Architecture

Put this immediately after the Figure 1 description and still before:

> Architectural Goals and Constraints

Insert:

1. 02-container-architecture.svg
2. Caption:

> Figure 2. ResourceHive Container and Service Architecture

3. Description:

> Figure 2 decomposes ResourceHive into its main runtime containers. Requests travel from the Next.js web application through the
> Nginx API Gateway to the responsible NestJS service. The services use shared authentication and database packages and store
> authoritative information in PostgreSQL.

———

### Diagram 03 — Identity Use Cases

Search for:

> Figure 01. Identity and Tenant Onboarding Use Cases

This diagram appears to have already been inserted by another member.

If it exists:

- Do not insert it again.
- Change the caption from Figure 01 to:

> Figure 3. Identity and Tenant Onboarding Use Cases

- Add this paragraph immediately below the caption:

> Figure 3 summarizes the identity and tenant-onboarding functions of ResourceHive. Visitors can register and verify their
> institutional email, while members can log in, recover their password, refresh their session, and link an OAuth account. Platform
> administrators can create root tenants, appoint initial administrators, and suspend tenants or users.

If the search finds nothing, search for:

> Use-Case View

Insert Diagram 03 as the first diagram under that heading, before the organization and booking use-case diagrams.

———

### Diagram 14 — Identity and Tenant Classes

Search for:

> Persists recipient-scoped alerts and tracks read statuses

This is near the end of Section 5.2, inside the “Notification Package” description.

Go to the end of that Notification Package subsection. Insert Diagram 14 before the class diagram that is currently below it.

Insert:

1. 14-domain-class-identity-tenant.svg
2. Caption:

> Figure 6. Identity, Tenant, and Membership Domain Classes

3. Description:

> Figure 6 shows how global user identities are connected to tenant organizations through organization memberships. The parent and
> root organization relationships represent the organization hierarchy and tenant boundary. Authentication-related classes support
> email verification, password recovery, refresh tokens, allowlists, and OAuth accounts.

———

### Diagram 15 — Booking Classes

Put this immediately after the Figure 6 description.

Insert:

1. 15-domain-class-booking.svg
2. Caption:

> Figure 7. Resource, Booking, Points, and Semester Domain Classes

3. Description:

> Figure 7 connects organization-owned resources to availability slots and user bookings. PointTransaction represents the append-only
> points ledger used for booking deductions, refunds, joining bonuses, and semester allocations. Its relationships record the source
> of each transaction for auditing purposes.

Important: the document currently has another diagram incorrectly captioned as Figure 7. Search for:

> Figure 7. Resource, Booking, Points, and Semester Domain Classes

If the picture above that existing caption is the rating, dispute, and notification diagram, change its caption to:

> Figure 8. Rating, Dispute, and Notification Domain Classes

Your newly inserted booking diagram should remain Figure 7.

———

### Diagram 17 — Tenant Authorization

Search for:

> Process View

Find the actual Section 6 heading—not the Table of Contents entry.

Insert Diagram 17 immediately before the Section 6 “Process View” heading. It should be the final diagram in Section 5, “Logical
View.”

Insert:

1. 17-tenant-authorization.svg
2. Caption:

> Figure 9. Tenant Boundary and Inherited Administration

3. Description:

> Figure 9 illustrates inherited organization administration. An administrator of Faculty A1 can manage that organization and its
> descendant Department A1.1, but cannot manage an ancestor organization, an unrelated branch, or another tenant. Tenant-sensitive
> operations must therefore verify both organization ancestry and the root organization identifier.

———

### Diagram 20 — Target ERD

Search for:

> Data View (optional)

Find the actual Section 9 heading. Under it, you should see blue/template text beginning with:

> [A description of the persistent data storage perspective

Delete that template paragraph and paste:

> ResourceHive stores tenant, identity, resource, booking, points-ledger, notification, rating, and dispute information in a shared
> PostgreSQL database managed through Prisma migrations. Tenant boundaries are represented through organization relationships and root
> organization identifiers.

Then insert:

1. 20-target-erd.svg
2. Caption:

> Figure 20. ResourceHive Target Data Model

3. Description:

> Figure 20 presents the main persistent entities and their relationships. Organizations anchor tenant-owned resources, memberships,
> semesters, and access rules. Users are connected to bookings, point transactions, authentication records, and notifications, while
> completed bookings may be connected to ratings and disputes.

———

### Diagram 21 — Database Integrity

Place this immediately after the Figure 20 description and before:

> Size and Performance

Insert:

1. 21-database-integrity.svg
2. Caption:

> Figure 21. Database Integrity and Concurrency Controls

3. Description:

> Figure 21 shows the application and PostgreSQL controls used to preserve data integrity. Composite tenant keys prevent cross-tenant
> relationships, booking constraints prevent conflicting reservations, unique indexes prevent duplicate point events, and append-only
> triggers preserve ledger and dispute histories during concurrent requests.

Final order of your diagrams in the Google Doc:

Section 2
Figure 1
Figure 2

Section 4
Figure 3

Section 5
Figure 6
Figure 7
existing Figure 8
Figure 9

Section 9
Figure 20
Figure 21
