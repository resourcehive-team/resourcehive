# ResourceHive Architecture Document Review

Reviewed against the final PDF, the current services, Nginx gateway, shared packages, Prisma schema, SQL migrations, and CI workflow.

## Verdict

The document is close to submission quality, but it is **not fully accurate yet**. The main problems are Figure 7, several incorrect API routes, and a mismatch between the latest SQL migration and the Prisma schema. The report should also clearly label unimplemented behavior as **target architecture** rather than current functionality.

## Important corrections

1. **Replace Figure 7.** Use `C/15-domain-class-booking.svg`. The current Figure 7 duplicates fields, shows Semester incorrectly, and gives Organization–Semester the wrong multiplicity.
2. **Fix Figure 8.** Add the missing User UUID, include `COMPLETED` in Booking status and `REJECTED` in dispute status, remove the repeated event type, and show the dispute submitter/event actor relationships.
3. **Correct routes in Figures 10, 13, 19, 20, and 21** using the paths listed below.
4. **State that Figures 4, 5, 6, 12–17, and parts of 19–24 describe the target design.** Several of those APIs and workflows are not implemented yet.
5. **Resolve the database model mismatch.** The latest SQL migration contains refresh tokens, password-reset tokens, OAuth accounts, semesters, ratings, and disputes, but `db/schema/schema.prisma` does not model all of them.
6. Change Section 9 from **“complete data model”** to **“high-level data model.”** The ERDs summarize relationships; they do not show every column or constraint.
7. Put each figure description directly below its own caption. Figures 4 and 5 still need descriptions, while the descriptions for Figures 19–21 are grouped later on page 50.
8. Enlarge the text in Figures 10–16. It is difficult to read at normal page size.

## Diagram review

| Figure | Result | Required action |
| --- | --- | --- |
| 1 — System context | Mostly accurate | The DNS/HTTPS arrow direction is unclear; show the user/client reaching ResourceHive through DNS/HTTPS. |
| 2 — Container diagram | Mostly accurate | Add Notification Service → email provider. Clarify that the separate marketing website is planned because the repository currently has only `apps/web`. |
| 3 — Identity use cases | Mostly accurate | Password recovery belongs to a registered user, not only an approved member. Mark OAuth and platform-admin onboarding actions as future work. |
| 4 — Resource use cases | Good target design | Add a short description. Root/child organization creation is not currently exposed by Resource Service. |
| 5 — Booking/notification use cases | Target-only in several places | Add a description. Cancellation refunds, completion, semesters, ratings, disputes, and analytics are not current service endpoints. |
| 6a — Identity classes | Mostly accurate to SQL | Current Prisma does not include every shown model. Add the refresh-token replacement/self-reference if retaining implementation detail. |
| 6b — Organization/resource classes | Good | Consider showing the root-organization self-relation and root-only email-domain rule. |
| 7 — Booking/points classes | **Incorrect** | Replace it with `C/15-domain-class-booking.svg`. |
| 8 — Rating/dispute classes | **Incomplete** | Fix missing IDs, statuses, duplicate field, and actor relationships described above. |
| 9a — Tenant boundary | Accurate | No structural change needed. |
| 9b — Inherited administration | Accurate | Remove or update the long repeated class explanation below it; its Booking statuses are outdated. |
| 10 — Signup/verification sequence | Inaccurate routes/current behavior | Use `POST /auth/register` and `POST /auth/verify-email`. Opening the email link first loads the frontend verification page. Refresh-token behavior should be labelled target architecture unless implemented. |
| 11 — JWT verification | Accurate architecture | It correctly shows each service verifying JWTs locally through the shared auth package. |
| 12 — Organization creation | Good target design | These creation endpoints are not currently implemented. Ensure the figure has a normal caption outside the image. |
| 13 — Resource creation | Inaccurate routes | Current create route is `POST /resources/organization/{organizationId}` and update is `PATCH /resources/organization/{organizationId}/{resourceId}`. There is no separate allowed-organizations PUT endpoint. |
| 14 — Booking transaction | Accurate core flow | Notification after commit is planned; the current Booking Service does not call Notification Service. |
| 15 — Cancellation/refund | Target-only | The current Booking Service has no cancellation/refund endpoint. |
| 16 — Rating/dispute | Target-only | The current services do not expose the shown rating/dispute endpoints. |
| 17 — Booking lifecycle | Accurate target lifecycle | No change needed if clearly labelled target behavior. |
| 18 — Booking states | Accurate | `CONFIRMED`, `CANCELLED`, and `COMPLETED` match the database design. |
| 19 — Registration activity | Inaccurate route/flow | Use Next.js → Nginx → Identity, `POST /auth/register`, then the frontend verification page and `POST /auth/verify-email`. |
| 20 — Membership activity | Inaccurate routes | Use `POST /memberships/{organizationId}/request` and `PATCH /memberships/organization/{organizationId}/users/{userId}/approve`. Mention that the eligible join bonus is granted atomically after approval. |
| 21 — Resource creation activity | Inaccurate routes | Roots use `GET /organizations/roots`; creation uses `POST /resources/organization/{organizationId}`. Show that the owner organization is automatically allowed. |
| 22 — Deployment | Mostly accurate | Clarify that it focuses on the application frontend, or add the planned marketing frontend. Put the description after the caption and fix “Below figure 22, shows.” |
| 23 — Package diagram | Too generic | Name all four services and the shared packages. Do not imply every service has a repository layer; Identity and Resource currently use PrismaService directly. |
| 24a — Identity ERD | Accurate to later SQL migration | It is not fully represented in the current Prisma schema; the refresh-token replacement relation is omitted. |
| 24b — Tenant ERD | Accurate high-level view | No major change required. |
| 24c — Organization ERD | Mostly accurate | The root-only email-domain rule is enforced by SQL but not visible in the ERD. |
| 24d — Resource/booking ERD | Accurate high-level view | Composite tenant foreign keys are not visible; Figure 25b should remain as the supporting control diagram. |
| 24e — Points/semester ERD | Accurate to SQL migration | These later models/fields are not fully available through the current Prisma client. |
| 24f — Rating/dispute ERD | Accurate to SQL migration | These models are not fully available through the current Prisma client or service APIs. |
| 25a — Booking transaction controls | Accurate | Matches the serializable transaction, retry handling, and atomic point deduction in Booking Service. |
| 25b — Database controls | Accurate | Correctly summarizes the main SQL constraints, triggers, and exclusion constraint. |

## Codebase gaps the report must not present as completed

- Identity currently does not expose every OAuth, refresh-token, and password-reset behavior shown in the diagrams.
- Booking currently implements booking creation and slot operations, but not the full cancellation, completion, rating, dispute, or semester lifecycle.
- Resource currently lacks some organization-management operations shown in the target diagrams.
- The current CI workflow does not yet perform every check claimed by a full production pipeline: all service builds/tests, Docker builds, database integrity/concurrency tests, and complete lint/type checks are not all enforced.

## Final document cleanup

- Change wording such as **“Figure 8, shows”** to **“Figure 8 shows.”** Apply this throughout.
- Use one external caption and one short description for every figure; remove any embedded or duplicate captions.
- Keep figure numbering consistent after replacing Figure 7.
- Ensure all diagrams remain readable when the PDF is viewed at 100% zoom.

After the route corrections, Figure 7 replacement, Figure 8 correction, and explicit target/current labeling, the document will be suitable as a final architecture report.
