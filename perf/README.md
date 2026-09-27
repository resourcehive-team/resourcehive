# Performance and quality checks

This tooling is for an isolated, synthetic environment only. Do not point it at production or any database containing real user data. The seed command refuses to run unless both a dedicated `PERF_DATABASE_URL` and the explicit `PERF_DATABASE_CONFIRM_NONPROD=YES` acknowledgement are provided. It does not read the normal `DATABASE_URL`.

## Prepare an isolated environment

1. Create a Neon branch from a nonproduction parent with no production data, or provision a separate local PostgreSQL database. Apply the current schema migrations to that database. The branch must have the same extensions and database settings as the normal integration environment.
2. Copy the local environment file to the ignored `perf/.env` file. Change its database URLs to the isolated database and leave real delivery providers disabled:

   ```powershell
   Copy-Item .env perf/.env
   # Edit perf/.env: DATABASE_URL and DATABASE_URL_UNPOOLED must both target the isolated database.
   # Keep RESEND_ENABLED=false and FCM delivery disabled. Keep Kafka enabled/reachable.
   ```

   To deploy migrations to that database without changing the normal local `.env`, explicitly set the Prisma URLs to the isolated URL for this command:

   ```powershell
   $env:PERF_DATABASE_URL = "<isolated database URL>"
   $env:PERF_DATABASE_URL_UNPOOLED = "<direct URL for the same isolated database>"
   $env:DATABASE_URL = $env:PERF_DATABASE_URL
   $env:DATABASE_URL_UNPOOLED = $env:PERF_DATABASE_URL_UNPOOLED
   pnpm run db:migrate
   Remove-Item Env:DATABASE_URL
   Remove-Item Env:DATABASE_URL_UNPOOLED
   ```

3. Build the frontend and backend images and start the base stack. FCM is intentionally omitted for load tests; Kafka remains enabled because bookings and notification commands use it.

   ```powershell
   pnpm --filter frontend build
   docker compose --env-file perf/.env up --build -d --wait
   ```

   In another terminal, start the already-built frontend with `pnpm --filter frontend start`.

4. Seed two synthetic root organizations and the configured number of verified users, one active resource and future booking slot per user, one completed historical booking per user, one open dispute per ten users, and five notifications per user. The seed is idempotent for its fixed fixture IDs. It refuses to reset a fixture slot that still has a non-cancelled booking.

   ```powershell
   $env:PERF_DATABASE_URL = "<isolated database URL>"
   $env:PERF_DATABASE_CONFIRM_NONPROD = "YES"
   $env:PERF_USER_COUNT = "100"
   pnpm --filter identity-service exec ts-node scripts/seed-performance.ts
   Remove-Item Env:PERF_DATABASE_URL
   Remove-Item Env:PERF_DATABASE_CONFIRM_NONPROD
   ```

   The command prints the synthetic user pattern, password, tenant IDs, and slot-ID mapping. Never use this synthetic password outside the isolated environment.

## Run the k6 suite

### Existing confirmed non-production stack

Run `node perf/prepare-local.cjs --check` for read-only prerequisite checks. Run `node perf/prepare-local.cjs --confirm-nonproduction` to add synthetic fixtures to the database used by the running containers. This does not reset the database or run migrations. It verifies matching service database configurations and disabled Resend/FCM delivery, runs the seed inside Identity's container, and redacts credentials. Only use this on a confirmed non-production test environment.

For a smoke test without recreating dependencies:

```powershell
docker compose -f docker-compose.yml -f docker-compose.perf.yml --profile perf run --rm --no-deps -e PERF_VUS=1 -e PERF_RAMP=10s -e PERF_DURATION=30s k6
```

The suite preserves cookies between iterations and aborts immediately on failed login. Reliability thresholds are unchanged. Booking pagination requires the updated Booking image with numeric query conversion.

The repository pins the official Grafana k6 container to `2.3.0` for repeatability. The Compose runner reaches the local gateway over the private Docker network; the native CLI script defaults to `http://localhost:8088`.
The Compose runner sets `PERF_HOST_HEADER=localhost:8000` so Caddy matches the local API site while k6 connects to `api-gateway:8000`. If `API_DOMAIN` uses another hostname, set `PERF_HOST_HEADER` to that site's host and port before running k6. Native k6 runs leave this header unset unless explicitly configured.

```powershell
$env:PERF_USER_COUNT = "100"
$env:PERF_USER_PASSWORD = "PerfOnly-1024!"
$env:PERF_VUS = "10"
$env:PERF_RAMP = "30s"
$env:PERF_DURATION = "2m"
$env:PERF_RUN_NAME = "warm-01"
docker compose --env-file perf/.env -f docker-compose.yml -f docker-compose.perf.yml --profile perf run --rm k6
```

The Compose runner writes `perf/results/<PERF_RUN_NAME>.json` (ignored by Git); use a distinct run name for each repeat. To run outside Compose, install k6 using the [official setup guide](https://grafana.com/docs/k6/latest/set-up/install-k6/) and run `k6 run perf/k6/suite.js --summary-export perf/results/warm-01.json` with `PERF_BASE_URL=http://localhost:8088`.

The suite distributes virtual users across two root organizations and samples login, `/auth/me`, resource browse, personal bookings, analytics, disputes, notifications, and booking create/cancel. Booking cycles use an exclusive synthetic slot per user. The first login is included in the suite; refresh-token rotation is sampled every 30 iterations. Local booking events continue to flow through Kafka, but Resend and browser-push delivery must remain disabled.

Initial thresholds are reliability checks (`<1%` failed HTTP requests, `>99%` k6 checks, and no unexpected response counter increments); they are not a capacity claim. Keep the same data volume, VU stages, cache state, Neon compute size, region, image versions, and test window for comparisons. Run at least three independent warm steady-state samples and report median throughput, p50/p95/p99 latency, error rate, and k6 checks. Record a separate first-run/Neon cold-start sample rather than mixing it with warm results.

For a short smoke run, set `PERF_VUS=2`, `PERF_RAMP=10s`, and `PERF_DURATION=30s`. Increase VUs gradually only on this isolated environment. Do not send performance traffic to production.

## Lighthouse and frontend inspection

Run the same production build on each pass, serve it with `pnpm --filter frontend start`, and run three clean desktop and mobile Lighthouse samples against the same route and browser profile. Keep extensions disabled and clear site storage between samples. Record medians for performance, accessibility, best practices, FCP, LCP, Speed Index, TBT, CLS, console errors, and contrast findings. Do not compare a development server run to a production build.

Vercel Analytics is intentionally rendered only in Vercel deployments. A local `next start` run must not request `/_vercel/insights/script.js`.

## Database, Redis, Kafka, and container observations

Capture measurements during the exact k6 window:

- `docker stats --no-stream` for service, Redis, and Kafka CPU/memory.
- Redis `INFO` and `INFO commandstats` before/after; cache prefixes are `resourcehive:identity`, `resourcehive:resource`, and `resourcehive:booking`.
- Kafka consumer-group lag for the notification service and broker/topic metrics. Do not compare a run while lag is still accumulating.
- Neon branch compute, active connections, query latency, cache hit ratio, and cold-start state from the branch/provider metrics.
- Application logs for timeouts, retries, Prisma errors, and queue failures.

Use a read-only connection to inspect candidate slow SQL. Begin with sampled query statistics from the isolated database, then copy the exact query and representative parameters into `EXPLAIN (ANALYZE, BUFFERS, VERBOSE)`; do not invent indexes from endpoint names. For example, booking history is tenant/user filtered and ordered, so inspect the actual generated SQL before considering a composite index. Any retained index must be justified by before/after plans and added as a forward-only migration with integrity coverage.

## Results status

The previously supplied Lighthouse report is the available frontend baseline: mobile performance 91, accessibility 95, best practices 96; FCP 2.1 s, LCP 2.5 s, Speed Index 4.3 s, TBT 180 ms, CLS 0. It also showed a local Vercel Analytics script 404 and a low-contrast dashboard eyebrow. The desktop run reported performance 100, LCP 0.6 s, and TBT 10 ms, with the same Analytics and contrast issues.

No full-stack before/after API, DB, Redis, or Kafka results are committed yet: this workspace has no confirmed isolated performance database branch. Do not substitute production. After the isolated run, add dated raw summaries and a short comparison table here; record unavailable measurements as pending rather than estimating them.

| Metric                             | Baseline                    | After   | Notes                                        |
| ---------------------------------- | --------------------------- | ------- | -------------------------------------------- |
| Mobile Lighthouse median           | 91 / 95 / 96 (Perf/A11y/BP) | Pending | Three clean production-build runs required   |
| API warm p95 / throughput / errors | Pending                     | Pending | Same k6 profile and isolated database        |
| Database slow-query plans          | Pending                     | Pending | Only sampled, representative statements      |
| Redis hit/miss and invalidation    | Pending                     | Pending | Confirm tenant isolation and cache freshness |
| Kafka consumer lag                 | Pending                     | Pending | Resend and FCM disabled                      |
