# ResourceHive Architecture Document Review

Reviewed on 8 August 2026.

Files checked:

- `architecture doc resourcehive.docx`
- `4 = Template for Software Architecture Document.docx`
- `internal-documentation/README.md`
- the current services, gateway, shared packages, Prisma schema, and SQL migrations
- all diagrams embedded in the architecture document

## Verdict

The document is substantially complete, but it is **not ready for final submission yet**. All required major sections exist, and Figures 1–25 are in broadly correct sections. However, the front matter and table of contents are unfinished, Section 12 still contains template instructions instead of references, several diagram captions or descriptions are missing or misplaced, Figure 7 is the wrong version, some API paths do not match the project, and the document does not distinguish the target architecture from the features currently implemented.

Complete the corrections below in order.

## 1. Fix the cover, header, and revision history

### Version

On the cover and in every page header, change:

> Version \<1.0\>

to:

> Version 1.0

Remove the angle brackets.

### Date

The document currently says `09 August 2026`, while this review was performed on `08 August 2026`. Use the actual submission date consistently on every page.

### Revision history

Delete the placeholder row containing:

> \<dd/mmm/yy\> | \<x.x\> | \<details\> | \<name\>

Add a real row. If this is the first submitted version, use:

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 08 August 2026 | 1.0 | Initial ResourceHive software architecture baseline | ResourceHive Team |

Replace the date or author with the actual submission information if necessary.

### Document identifier

The template reserves a header line for a document identifier, but the completed document leaves it empty. Use:

> RH-SAD-001

### Confidential footer

The footer currently says `Confidential`. Keep this only if the team or lecturer requires it. Otherwise, remove `Confidential` from every footer. The copyright text `© ResourceHive, 2026` is acceptable.

## 2. Repair heading styles and the table of contents

The current table of contents is incorrect. It includes normal sentences such as `The approved architecture contains`, includes only `4.1.2 Verify email` from the use cases, and omits Section 12.

In Google Docs, apply these styles:

- **Heading 1:** Sections 1 through 12.
- **Heading 2:** Sections 1.1–1.5, 3.1–3.3, 4.1, 5.1–5.2, 6.1, 7.1–7.2, and 8.1–8.2.
- **Normal text:** ordinary paragraphs, figure captions, bullet points, and sentences such as `The approved architecture contains`.
- The individual use cases `4.1.1` through `4.1.22` may use Heading 3, but using bold normal text will keep the table of contents shorter.

Make these heading text corrections:

- Change `Use-Case Realizations` to `4.1 Use-Case Realizations`.
- Change the Section 8 heading `Overview` to `8.1 Overview`.
- Change the Section 8 heading `Layers` to `8.2 Layers`.
- Change `12.References` to `12. References`.

Then click the table of contents and select **Update table of contents**. Confirm that every main section has a page number and that ordinary sentences no longer appear.

## 3. State clearly that this is the target architecture

The document currently mixes implemented behavior with planned final behavior. Add this paragraph at the end of Section 1.2, after the paragraph about the shared PostgreSQL database:

> This document describes the approved target architecture of ResourceHive. Some later-phase capabilities, including password reset, refresh-token rotation, optional OAuth linking, booking cancellation and refunds, semester allocations, ratings, disputes, analytics, and complete notification delivery, are represented as intended final behavior and are not all implemented in the current repository baseline.

This sentence allows the intended architecture to remain in the document without incorrectly claiming that every endpoint already exists.

## 4. Fix the references sections

The complete IEEE-style list currently appears in Section 1.4, while Section 12 still contains the template instructions. Use the following structure.

### Section 1.4

Replace the long reference list in Section 1.4 with:

> The complete list of standards, technical documentation, and diagramming tools referenced by this architecture is provided in Section 12. PlantUML and draw.io were used to prepare the design diagrams.

### Section 12

Delete all template instruction text beginning with:

> Refer any data/information in a standard format

Move the existing numbered references `[1]` through `[14]` from Section 1.4 into Section 12.

Add citations in the body where the referenced technologies are introduced. At minimum:

- Cite ISO/IEC/IEEE 42010 and UML in Section 2 as `[1], [2]`.
- Cite PlantUML and draw.io when stating which tools created the diagrams as `[3], [4]`.
- Cite Next.js, NestJS, PostgreSQL, Prisma, Docker, Nginx, OpenAPI, and GitHub Actions in the relevant architecture/technology paragraphs as `[5]` through `[12]`.
- Cite JWT in the authentication section as `[13]`.
- Cite WCAG in the Quality section as `[14]`.

## 5. Apply one consistent figure format

For every figure:

1. Use the highest-quality SVG where available.
2. Set the image to **In line with text**.
3. Centre the image.
4. Crop any title beginning with `Figure ...` that is embedded inside the image.
5. Put one normal document caption directly below the image.
6. Put the explanatory paragraph directly below the caption.
7. Ensure labels remain readable when printed. The template recommends approximately 12-point black text on a white background.

The C diagrams that currently contain an embedded title and must be cropped are Figures 1, 2, 6(a), 6(b), 7 after replacement, 9(a), 9(b), 24(a)–24(f), and 25(a)–25(b).

Figures 2, 7, 8, 10–16, and 23 contain particularly small text. Enlarge them to the full available page width. If the labels are still too small, place the diagram on a landscape page or regenerate it with larger text. Do not solve this by stretching a low-resolution screenshot.

## 6. Diagram-by-diagram corrections

### Figure 1 — ResourceHive System Context

Placement and the external caption are correct.

Required:

- Crop the embedded title from the top of the image.
- Keep the external caption and description.

Minor improvement: the arrow `ResourceHive Platform → DNS / HTTPS` labelled `Public access` is backwards conceptually. DNS and HTTPS infrastructure provides access to ResourceHive. If the source diagram is edited later, show the user reaching ResourceHive through DNS/HTTPS instead.

### Figure 2 — Container and Service Architecture

Placement and the external description are correct.

Required:

- Crop the embedded title.
- Make the diagram larger because its service and route labels are small.
- Add a connection from `Notification Service` to `Email Provider`, labelled `Notification email`, because the Deployment View already states that both Identity and Notification use the email provider.

The marketing website is part of the approved target architecture but is not currently present under `apps/`. This is acceptable only because Section 1.2 will identify the document as the target architecture.

### Figure 3 — Identity and Tenant Onboarding Use Cases

Placement, caption, and description are correct.

Correct the actors:

- `Approved Member` is not the right actor for password recovery. Rename it to `Registered User`.
- If desired, use a separate `Authenticated User` actor for `Refresh session`, `Log out`, and `Link OAuth account`.
- Label OAuth linking as optional/future because it is not part of the minimal initial architecture.

An `<<include>>` relationship is not required between signup and email verification because verification occurs later as a separate user action. Do not add UML relationships merely for decoration.

### Figure 4 — Organization, Membership, and Resource Use Cases

Placement and caption are correct, but the required description is missing. Add directly below the caption:

> Figure 4 summarizes organization, membership, and resource use cases. Approved members discover organizations, request membership, browse permitted resources, and view resource details. Authorized organization administrators manage child organizations, membership requests, email domains, allowlists, resources, organizational visibility, and availability slots within their permitted tenant hierarchy.

### Figure 5 — Booking, Points, Notifications, Ratings, and Disputes Use Cases

Placement and caption are correct, but the required description is missing. Add directly below the caption:

> Figure 5 summarizes the member and administrator use cases owned by the Booking and Notification domains. Members book and cancel slots, view bookings and point history, read notifications, rate completed resource use, and open disputes. Authorized organization administrators complete returns, allocate semester points, review disputes, and view tenant-scoped analytics.

### Figure 6(a) — Identity and Authentication Domain Classes

Placement, caption, and description are correct.

Required:

- Crop the embedded title.
- If refresh-token rotation remains in the target architecture, add `replacedByTokenId: UUID?` or a self-relation to `RefreshToken`. The SQL migration contains this relationship, but the class diagram currently omits it.

### Figure 6(b) — Tenant and Membership Domain Classes

Placement, caption, and description are correct.

Required:

- Crop the embedded title.
- Add the root-organization self-relationship, showing one root organization connected to its descendants. The diagram currently shows only `parentId` hierarchy.
- Add a note that `OrganizationEmailDomain` records may belong only to root organizations.

### Figure 7 — Resource, Booking, Points, and Semester Domain Classes

The current document contains the wrong Figure 7 image.

Do this exactly:

1. Go to Section 5.2 and find `Figure 7. Resource, Booking, Points, and Semester Domain Classes`.
2. Delete the wide diagram immediately above that caption. It contains large frames titled `Core domain references`, `Resource and booking domain`, and `Points and semester domain`.
3. Insert `15-domain-class-booking.svg` from the C folder in the same position.
4. Crop the embedded Figure 7 title from the inserted image.
5. Keep the existing external Figure 7 caption and description.

The current wide diagram must not remain because it contains concrete errors:

- `Semester` lists `id` twice.
- `PointTransaction` lists `transactionType` twice.
- It shows an incorrect one-to-one Organization–Semester relationship.
- Several relationship lines are difficult to follow.

If the replacement diagram is updated later, add `cancellationPeriodMinutes` to `Booking` because the migration stores a policy snapshot on each booking.

### Figure 8 — Rating, Dispute, and Notification Domain Classes

The placement and caption are correct, but the diagram and description require correction.

Correct these diagram fields:

- Change `User id:` to `User id: UUID`.
- Show all Booking statuses: `CONFIRMED | CANCELLED | COMPLETED`.
- Show all BookingDispute statuses: `OPEN | UNDER_REVIEW | RESOLVED | REJECTED`.
- Combine the two repeated `eventType` rows in BookingDisputeEvent into one clear list.
- Add the missing relationship from User to BookingDispute for `submittedByUserId`.
- Add the missing relationship from User to BookingDisputeEvent for `actorUserId`.

Add this description directly below the Figure 8 caption:

> Figure 8 shows the feedback, dispute, and notification classes connected to users, resources, and bookings. A completed booking may receive at most one resource rating and at most one dispute. Each dispute keeps an append-only event history, while notifications are stored for one recipient so users retain their alert history even when real-time delivery is unavailable.

After adding this description, delete the later block beginning:

> The Class Diagram illustrates the structural relationships

and ending with:

> manage the user's inbox state.

That block is repetitive, is too far away from Figures 7 and 8, and incorrectly lists only `CONFIRMED` and `CANCELLED` for Booking.

### Figures 9(a) and 9(b) — Tenant Authorization

Placement, separate captions, and descriptions are correct.

Required:

- Crop the embedded titles from both images.
- Keep them as separate vertically stacked figures unless both remain clearly readable when grouped.

### Figure 10 — Identity Onboarding and Authentication

Placement and description are correct, but the routes and implementation status need correction.

Change the registration request from:

> POST /auth/signup

to:

> POST /auth/register

The verification link should open the Next.js page first, after which the frontend calls:

> POST /auth/verify-email

Do not show the browser directly making `GET /auth/verify-email?token=...` to the backend because that is not the current frontend/backend contract.

The diagram shows a stored refresh token, but the current Identity Service only issues one access-token cookie. Keep refresh rotation only as target behavior under the target-architecture note, or update the project later before claiming it is implemented.

Globally change `Figure 10, shows` to `Figure 10 shows`.

### Figure 11 — Authenticated Request and Role Validation

This diagram matches the approved architecture: Nginx routes, the service verifies the JWT locally through the shared package, and the service queries authoritative database information for authorization.

Required:

- Enlarge it if the printed labels are difficult to read.
- Change `Figure 11, shows` to `Figure 11 shows`.

### Figure 12 — Tenant and Organization Hierarchy Setup

The image is in the correct place, but its caption is wrong. Change:

> 12. Tenant and Organization Hierarchy Setup

to:

> Figure 12. Tenant and Organization Hierarchy Setup

The platform must obtain `platform_role` from authoritative user data rather than trusting an organization role supplied by the browser.

Change `Figure 12, shows` to `Figure 12 shows`.

### Figure 13 — Resource Creation and Allowlist Configuration

The target behavior is correct, but the routes do not match the current Resource Service.

Use these current gateway routes:

> POST /resources/organization/{organizationId}

and:

> PATCH /resources/organization/{organizationId}/{resourceId}

The update request body may contain the allowed organization IDs. The current project does not provide a separate `PUT /resources/{id}/allowed-organizations` route.

Delete the standalone backslash (`\`) between Figure 13's description and Figure 14.

Change `Figure 13, shows` to `Figure 13 shows`.

### Figure 14 — Atomic Booking and Point Deduction

The normal document caption is missing. Add directly below the diagram:

> Figure 14. Atomic Booking and Point Deduction

Then keep the existing description below the caption and change `Figure 14, shows` to `Figure 14 shows`.

The atomic booking and deduction match the current Booking Service. The notification after commit is target behavior and is not yet called by the current booking creation code.

### Figure 15 — Booking Cancellation and Refund

Placement, caption, and target behavior are reasonable.

Required:

- Change `Figure 15, shows` to `Figure 15 shows`.
- Treat cancellation and refund as target behavior because the current Booking Service has no cancellation endpoint.

### Figure 16 — Rating and Dispute Processing

Placement, caption, and target behavior are reasonable.

Required:

- Change `Figure 16, shows` to `Figure 16 shows`.
- Treat rating and dispute endpoints as target behavior because the current services do not expose them.
- Ensure the final route names match the endpoints when those APIs are implemented.

### Figure 17 — Booking Lifecycle Activity

Placement, caption, and flow are acceptable.

Change `Figure 17, summarizes` to `Figure 17 summarizes`.

### Figure 18 — Booking State Model

Placement, caption, and state transitions are correct.

Change `Figure 18, shows` to `Figure 18 shows`.

### Figure 19 — Registration and Email Verification Activity

The activity is in the correct section, but it bypasses the gateway and uses the wrong signup route.

Required:

- Add an `Nginx API Gateway` swimlane between `Next.js UI` and `Identity Service`.
- Change `POST /api/auth/signup` to `POST /auth/register`.
- Show the verification page calling `POST /auth/verify-email` through Nginx after extracting the token.
- Move the existing Figure 19 description from before the image to directly below the Figure 19 caption.
- Change `Figure 19, shows` to `Figure 19 shows`.

### Figure 20 — Membership Request and Admin Approval Activity

The activity is in the correct section, but it bypasses the gateway and its routes do not match the Resource Service.

Required:

- Add an `Nginx API Gateway` swimlane between `Next.js UI` and `Resource Service`.
- Change the membership request to:

> POST /memberships/{organizationId}/request

- Change approval to:

> PATCH /memberships/organization/{organizationId}/users/{userId}/approve

- After approval, show the approved membership and eligible joining-bonus point transaction being committed together. Then show the notification being created after successful approval.
- Move the existing Figure 20 description from before the image to directly below the Figure 20 caption.
- Change `Figure 20, shows` to `Figure 20 shows`.

### Figure 21 — Resource Creation and Visibility Activity

The activity is in the correct section, but it bypasses the gateway and uses routes that do not match the current Resource Service.

Required:

- Add an `Nginx API Gateway` swimlane between `Next.js UI` and `Resource Service`.
- Use `GET /organizations/roots` when loading root organizations, followed by the existing organization detail/children routes where required.
- Change `POST /api/resources` to:

> POST /resources/organization/{organizationId}

- Explicitly show that the owner organization is included in the resource allowlist.
- Change `Figure 21, shows` to `Figure 21 shows`.

### Figure 22 — Initial Production Deployment

The diagram correctly shows one external PostgreSQL provider, Nginx as the public backend entry point, private service containers, and email connections from Identity and Notification.

Required:

- Move the two descriptive paragraphs currently above the image to below the Figure 22 caption.
- Replace them with this cleaner description:

> Figure 22 shows the browser accessing the hosted Next.js application over HTTPS. API requests reach the Nginx container on the backend host, and Nginx routes them to the private Identity, Resource, Booking, and Notification containers through the Docker network. All four services connect to the external PostgreSQL provider using encrypted connections, while the Identity and Notification Services use the configured email provider. Hosting, database, and email vendors remain replaceable through environment configuration.

- The target architecture contains both a marketing website and an authenticated application. Either show both frontend deployments or add a note that this deployment diagram focuses only on the authenticated application.

### Figure 23 — ResourceHive Implementation Layers

Placement and description are correct, but this does not fully satisfy the template's request for a package diagram.

Revise the diagram so it explicitly contains these repository packages:

- `apps/web`
- `services/api-gateway`
- `services/identity-service`
- `services/resource-service`
- `services/booking-service`
- `services/notification-service`
- `packages/service-auth`
- `packages/database`
- `db/schema`

Show that all protected services depend on `packages/service-auth`, all database-using services depend on `packages/database`, and `packages/database` is generated from `db/schema`.

Do not force every service through a Repository component. The current Identity and Resource Services access `PrismaService` directly, while Booking and Notification use repository classes in some modules. Use the wording `Application services and optional repository adapters`.

Rename the caption to:

> Figure 23. ResourceHive Implementation Layers and Packages

### Figures 24(a)–24(f) — Data View

All six diagrams are in the correct order and have captions and descriptions.

Required:

- Crop the embedded titles.
- Keep the figures vertically stacked unless grouped images remain readable.
- In the Data View introduction, change `complete data model` to `high-level data model`, because these diagrams intentionally omit many columns, keys, indexes, and constraints.
- Mark OAuth data as optional/future.
- In Figure 24(c)'s description, state that email domains belong only to root organizations.

Use this revised Figure 24(c) description:

> Figure 24(c) shows the root-organization email domains and organization email allowlist used during registration and membership processing. Email domains identify root tenants, while allowlist entries may grant access to child organizations and record the user who added each entry.

### Figures 25(a) and 25(b) — Concurrency and Integrity

Placement, captions, descriptions, and content are correct.

Required:

- Crop the embedded titles.
- Keep both figures large enough for labels to be read when printed.

Figure 25(a) accurately matches the current Booking Service's serializable Prisma transaction, retry behavior, booking creation, and conditional point deduction. Figure 25(b) accurately summarizes the important SQL constraints and triggers.

## 7. Correct inaccurate wording in the use-case tables

### Sign up

Replace the current main-flow wording about allowlists and an inactive user with:

> The user opens the registration page and enters their name, institutional email address, and password. The system normalizes the email address, validates its domain against the configured root-organization email domains, checks that the email is not already registered, hashes the password, creates an active but unverified user record, and stores a hashed time-limited verification token. The system then sends the verification link.

The current database does not use an `INACTIVE` user status for unverified users. It uses `email_verified_at` to distinguish verification state.

### Verify email

Replace wording that says verification changes the account status to active with:

> The system marks the verification token as used, sets the user's `email_verified_at` timestamp, and creates any eligible approved organization memberships. The user's account status remains independently controlled by the ACTIVE or SUSPENDED status field.

### Login

Replace:

> The system generates JWT token containing the user's ID, roles, and root tenant context.

with:

> The Identity Service verifies the credentials and signs an access token containing the stable user identity and limited membership context. Each protected service uses authoritative database records to validate account status, tenant scope, memberships, roles, and organization ancestry.

Do not claim that the JWT contains all organization roles or a trusted root-tenant authorization decision.

### Book a resource slot

Replace the lines about applying a lock and updating the slot status with:

> The Booking Service starts a serializable database transaction, validates the authoritative user, tenant, membership, resource, slot, and point information, creates a CONFIRMED booking, and appends the negative BOOKING point transaction. PostgreSQL uniqueness and transaction isolation prevent concurrent requests from creating more than one active booking for the slot. Both writes commit together or roll back together.

`resource_slots` has no `CONFIRMED` status. The Booking record receives that status.

### Cancel own booking

Replace `the time slot becomes publicly available again` with:

> the time slot becomes available again to authorized members

Resources remain tenant- and allowlist-scoped; they are not public.

### Create child organization

The failure text claims duplicate organization names are rejected, but the schema does not define a unique organization-name constraint. Replace it with:

> Creation is rejected if the parent organization is invalid, the requested relationship crosses a tenant boundary, the administrator lacks authority, or the hierarchy would become cyclic.

### Small language corrections

Make these direct replacements:

- `and enter their name` → `and enters their name`
- `and create inactive user record in database` → use the complete signup text above
- `(date, amount,description)` → `(date, amount, description)`
- `(name, description,category,..)` → `(name, description, category)`
- `(equipment, a study room,...)` → `(equipment or a study room)`

## 8. Correct Logical View field names and statuses

In Section 5.2, make these replacements:

- `joining_bonus` → `join_bonus_points`
- Membership statuses `PENDING/APPROVED/REJECTED` → `PENDING/APPROVED/REJECTED/SUSPENDED`
- `cancellation_period` → `cancellation_period_minutes`
- BookingDispute statuses `OPEN/UNDER_REVIEW/RESOLVED` → `OPEN/UNDER_REVIEW/RESOLVED/REJECTED`
- `VerificationToken / RefreshToken` → `EmailVerificationToken, PasswordResetToken, RefreshToken, and OAuthAccount`

Use snake_case when discussing SQL columns and camelCase only when discussing TypeScript/Prisma properties.

## 9. Correct Process and Deployment wording

Throughout the Process View, remove the comma after the figure number:

- `Figure 10, shows` → `Figure 10 shows`
- Apply the same correction to Figures 11–21.

Replace:

> Below figure 22, shows

with the revised Figure 22 description supplied above.

Replace the Deployment Evolution sentence:

> Redis will be introduced for approved caching...

with:

> Redis may be introduced only when measured requirements justify caching, notification pub/sub, rate limiting, or WebSocket coordination. PostgreSQL remains authoritative for bookings, points, tokens, notifications, and disputes.

This matches the source-of-truth decision that Redis is optional rather than mandatory.

## 10. Repository gaps discovered during the architecture check

These are project issues, not instructions to alter the intended architecture. They must be resolved before the team claims the entire target architecture is implemented.

### Critical: Prisma schema does not match the latest migration

`db/schema/migrations/20260806000000_complete_core_features/migration.sql` creates or changes:

- resource cancellation policy fields
- booking cancellation fields
- semesters
- semester point-allocation fields
- resource ratings
- booking disputes and dispute events
- OAuth accounts
- password-reset tokens
- refresh tokens

`db/schema/schema.prisma` does not currently model these additions. Therefore, `@resourcehive/database` cannot provide normal Prisma models for much of the Data View even though the SQL migration creates the tables.

The team should update the Prisma schema to mirror the committed migrations in a separate development task. Do not hide this mismatch by deleting the intended entities from the architecture document.

### Identity implementation is behind the target diagrams

The current Identity Service provides registration, email verification, login, logout, `/auth/me`, and validation. It currently sets one HttpOnly access-token cookie. It does not currently expose password-reset, refresh-token rotation, or OAuth endpoints, even though the later migration and architecture describe them.

### Booking implementation is behind later lifecycle diagrams

The current Booking Service implements slot operations and atomic booking creation with point deduction. It does not currently expose cancellation, refund, completion, semester allocation, rating, dispute, booking-history, or analytics endpoints.

### Resource implementation does not expose every onboarding operation

The current Resource Service exposes organization reads, membership request/review, email domain and allowlist management, and Resource CRUD. It does not currently expose the full root-tenant and child-organization creation flow shown in the target diagrams.

### Marketing application is not present

The approved target architecture includes a public marketing website and an authenticated application. The current workspace contains only `apps/web`. Keep the marketing site in target diagrams only if the target-architecture statement remains in Section 1.2.

### CI is not yet as complete as the Quality section suggests

The current GitHub Actions workflow runs frontend component tests, database initialization, demo seeding, and Identity/Resource E2E tests. It does not currently run the full Booking and Notification test suites, all service builds and lint checks, database integrity/concurrency tests, or Docker image builds.

The Quality section is acceptable as a target architecture statement, but the CI workflow must be expanded before claiming all those checks are enforced on every pull request.

## 11. Final Google Docs checklist

Before exporting the final PDF, verify all of the following:

- [ ] No angle-bracket placeholders remain.
- [ ] Revision history contains real values.
- [ ] Date and version are consistent on every page.
- [ ] Heading levels and section numbers are correct.
- [ ] The table of contents has been refreshed.
- [ ] Section 12 contains the real numbered references, not template instructions.
- [ ] Every referenced source is cited somewhere in the body or removed.
- [ ] The target-architecture paragraph has been added to Section 1.2.
- [ ] Figure 7 has been replaced with `15-domain-class-booking.svg`.
- [ ] Figure 8's field and relationship errors have been corrected.
- [ ] Figure 12 has a proper `Figure 12` caption.
- [ ] Figure 14 has a normal document caption.
- [ ] Figure 19 and Figure 20 descriptions are below their own captions.
- [ ] Figures 19–21 include the Nginx gateway and current public route shapes.
- [ ] Figure 23 explicitly shows all repository packages.
- [ ] All embedded figure titles have been cropped.
- [ ] Every diagram has exactly one external caption and a short description.
- [ ] Every diagram remains readable at normal printed size.
- [ ] No standalone backslash remains between Figures 13 and 14.
- [ ] All `Figure N, shows` grammar errors have been corrected.
- [ ] The final PDF has been inspected page by page after export.

Once these items are complete, the architecture document will follow the supplied template closely and will describe the ResourceHive target architecture without misrepresenting the current implementation state.
