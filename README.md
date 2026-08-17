# ResourceHive

[![Deploy backend to Linode](https://github.com/resourcehive-team/resourcehive/actions/workflows/deploy.yml/badge.svg)](https://github.com/resourcehive-team/resourcehive/actions/workflows/deploy.yml)
[![API health](https://img.shields.io/website?url=https%3A%2F%2Fapi.resourcehive.thisismalindu.com%2Fhealth&label=API&up_message=online&down_message=offline)](https://api.resourcehive.thisismalindu.com/health)

ResourceHive helps university departments and clubs share resources such as
study rooms, equipment, project tools, and learning materials. Members can find
what they need, check availability, make bookings, and receive updates in one
place.

- Application: <https://app.resourcehive.thisismalindu.com>
- API health: <https://api.resourcehive.thisismalindu.com/health>

## Architecture

ResourceHive is a pnpm monorepo with a Next.js frontend and four NestJS backend
services.

| Component | Technology | Production host |
| --- | --- | --- |
| Frontend | Next.js, React, Tailwind CSS | Vercel |
| API gateway | Caddy | Linode |
| Identity, Resource, Booking, Notification | NestJS microservices | Docker on Linode |
| Database | PostgreSQL with Prisma | Neon |
| Container registry | GHCR | GitHub |
| CI/CD | GitHub Actions | GitHub |

Only Caddy exposes public backend ports. The four services communicate over a
private Docker network.

```text
apps/web/                       Next.js frontend
services/api-gateway/           Caddy configuration
services/identity-service/      Authentication, users, and email
services/resource-service/      Organizations, memberships, and resources
services/booking-service/       Bookings, slots, and points
services/notification-service/  Notifications
packages/database/              Shared Prisma package
packages/service-auth/          Shared service authentication
db/                             Prisma schema, migrations, and tests
```

## Local development

### Requirements

- Node.js 20 or newer
- pnpm 10.34.5
- Docker with Docker Compose
- Access to a PostgreSQL 15 database

Run commands from the repository root unless stated otherwise.

### First-time setup

Install dependencies:

```bash
pnpm install --frozen-lockfile
```

Create the local environment files without overwriting existing files:

```bash
test -f .env || cp .env.example .env
test -f apps/web/.env.local || cp apps/web/.env.example apps/web/.env.local
```

Set these values in `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@POOLED_HOST:5432/DATABASE?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://USER:PASSWORD@DIRECT_HOST:5432/DATABASE?sslmode=require"
JWT_SECRET="replace-with-a-private-secret"
```

For Neon, use the hostname containing `-pooler` for `DATABASE_URL` and the
direct hostname for `DATABASE_URL_UNPOOLED`. The same URL can be used for both
when the provider does not offer separate connections.

Set these values in `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
JWT_SECRET=replace-with-the-same-secret-used-in-the-root-env
```

The two `JWT_SECRET` values must match.

Initialize the database and create the demo account:

```bash
pnpm run dev:setup
```

### Local email

Local development uses the console email transport by default:

```env
EMAIL_TRANSPORT=console
```

Verification and password-reset links are printed in the Identity Service
logs instead of being emailed. Follow them with:

```bash
docker compose logs -f identity-service
```

To test real email locally, change `EMAIL_TRANSPORT` to `smtp` and configure
the SMTP variables described in the production section.

### Run the application

Build and start the backend for the first time:

```bash
docker compose up --build -d
```

For later starts:

```bash
docker compose up -d
```

Confirm that the containers are running:

```bash
docker compose ps
```

Start the frontend in a separate terminal:

```bash
pnpm run dev:web
```

Open <http://localhost:3000> and sign in with:

```text
Email: demo@example.edu
Password: DemoPassword123!
```

The demo seed creates a user, an approved membership, and a demo organization.
It does not create resources.

The API gateway runs at <http://localhost:8000>. If port 8000 is unavailable,
change both values:

```env
# .env
API_PORT=8088

# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8088
```

`API_PORT` is the host port. The service ports inside Docker do not need to be
changed.

### Logs, rebuilds, and shutdown

Follow all backend logs:

```bash
docker compose logs -f
```

Follow selected services:

```bash
docker compose logs -f api-gateway resource-service
```

Rebuild after backend source or dependency changes:

```bash
docker compose up --build -d
```

Stop and remove the local containers:

```bash
docker compose down
```

This does not delete the configured PostgreSQL database. Stop the frontend with
`Ctrl+C` in its terminal.

### Database commands

```bash
pnpm run db:validate          # Validate the Prisma schema
pnpm run db:migrate:status    # Check migration status
pnpm run db:init              # Apply migrations and build the database package
pnpm run db:migrate:create    # Create a migration after a schema change
```

Committed migrations are the database source of truth. Do not use
`prisma db push`.

### Tests

```bash
pnpm run test:web
pnpm --filter identity-service run test
pnpm --filter identity-service run test:e2e
pnpm --filter resource-service run test:e2e
```

Run database integrity and concurrent-booking tests only against a clean,
disposable PostgreSQL 15 database:

```bash
TEST_DATABASE_URL="postgresql://user:password@host:5432/database" \
bash db/schema/tests/run.sh
```

## Production deployment

Production uses:

```text
app.resourcehive.thisismalindu.com  Next.js application on Vercel
api.resourcehive.thisismalindu.com  Caddy and four services on Linode
                                     |
                                     +-- Neon PostgreSQL
```

The frontend and backend deploy independently. Vercel deploys the frontend from
`main`. A push to `main` starts the backend deployment workflow.

### 1. Create the Neon database

Create a PostgreSQL project and keep both connection strings:

- pooled connection for `DATABASE_URL`
- direct connection for `DATABASE_URL_UNPOOLED`

The deployment workflow runs committed Prisma migrations before starting the
backend.

### 2. Prepare the Linux server

The examples assume Ubuntu. Install Docker Engine and the Docker Compose plugin
using Docker's official installation guide, then verify:

```bash
docker --version
docker compose version
```

Create a non-root deployment user:

```bash
sudo adduser deploy
sudo usermod -aG docker deploy
sudo install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
sudo install -d -m 700 -o deploy -g deploy /home/deploy/resourcehive
```

Generate a dedicated SSH key on a trusted computer and authorize its public key
for the `deploy` user:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/resourcehive_deploy -C resourcehive-deploy
ssh-copy-id -i ~/.ssh/resourcehive_deploy.pub deploy@LINODE_IP
```

Confirm that the user can connect and run Docker before disabling any existing
root or password access:

```bash
ssh -i ~/.ssh/resourcehive_deploy deploy@LINODE_IP
docker ps
```

Allow inbound TCP ports 22, 80, and 443. Allow UDP 443 for HTTP/3. Do not expose
ports 3000, 3002, 3003, or 3004.

For a 2 GB server, check existing swap with `swapon --show` and add swap only if
needed.

### 3. Configure DNS

Create an `A` record for `api.resourcehive.thisismalindu.com` pointing to the
Linode IPv4 address. Ports 80 and 443 must be reachable so Caddy can obtain and
renew the HTTPS certificate.

If Cloudflare manages DNS for this nested hostname, keep the API record
DNS-only unless the active Cloudflare certificate covers the full hostname.

### 4. Create `.env.production`

Copy `.env.production.example` to the server:

```bash
scp -i ~/.ssh/resourcehive_deploy .env.production.example \
  deploy@LINODE_IP:/home/deploy/resourcehive/.env.production
```

On the server, restrict and edit it:

```bash
chmod 600 /home/deploy/resourcehive/.env.production
nano /home/deploy/resourcehive/.env.production
```

Configure every placeholder:

```env
IMAGE_TAG=main

API_DOMAIN=api.resourcehive.thisismalindu.com
ACME_EMAIL=admin@thisismalindu.com

DATABASE_URL="postgresql://USER:PASSWORD@POOLED_HOST/DATABASE?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://USER:PASSWORD@DIRECT_HOST/DATABASE?sslmode=require"

JWT_SECRET=replace_with_a_long_random_production_secret
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=30d
BCRYPT_ROUNDS=12
AUTH_COOKIE_DOMAIN=.resourcehive.thisismalindu.com
AUTH_COOKIE_SECURE=true

CORS_ORIGINS=https://app.resourcehive.thisismalindu.com
APP_URL=https://app.resourcehive.thisismalindu.com
EMAIL_VERIFICATION_TOKEN_EXPIRES_IN=24h
PASSWORD_RESET_TOKEN_EXPIRES_IN=1h

EMAIL_TRANSPORT=smtp
EMAIL_FROM="ResourceHive <no-reply@thisismalindu.com>"
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=replace_with_smtp_username
SMTP_PASSWORD=replace_with_smtp_password
```

Generate a production JWT secret with:

```bash
openssl rand -base64 48
```

For email, use credentials from any SMTP provider. Use port 587 with
`SMTP_SECURE=false` for STARTTLS, or port 465 with `SMTP_SECURE=true`. The
address in `EMAIL_FROM` must be accepted by the provider, which usually means
verifying the sender address or domain.

Never commit `.env.production`, SMTP credentials, database URLs, or private
keys.

### 5. Configure the Vercel project

Import this repository into Vercel and configure:

| Setting | Value |
| --- | --- |
| Root Directory | `apps/web` |
| Production Branch | `main` |
| Domain | `app.resourcehive.thisismalindu.com` |

Add these production environment variables:

```env
NEXT_PUBLIC_API_URL=https://api.resourcehive.thisismalindu.com
JWT_SECRET=the_same_secret_used_in_env_production
```

`NEXT_PUBLIC_API_URL` is public. `JWT_SECRET` is server-only and must not have a
`NEXT_PUBLIC_` prefix.

### 6. Configure GitHub Actions

Create a GitHub Environment named `production`. Restrict its deployment branch
to `main` and add these environment secrets:

| Secret | Value |
| --- | --- |
| `LINODE_HOST` | Linode IP address or SSH hostname |
| `LINODE_USERNAME` | `deploy` |
| `LINODE_SSH_PRIVATE_KEY` | Contents of the dedicated private key |
| `LINODE_SSH_KNOWN_HOSTS` | Verified SSH host-key entry for the Linode |

Create the known-hosts entry on a trusted machine:

```bash
ssh-keyscan -H -t ed25519 LINODE_IP
```

Compare its fingerprint with the server's real host-key fingerprint before
saving it:

```bash
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

The workflow uses GitHub's short-lived token for GHCR, so no permanent registry
token is needed on the server.

### 7. Release to production

The repository follows this flow:

```text
feature branch -> pull request into dev -> CI
merge into dev                         -> CI on the combined dev branch
dev -> main pull request               -> Main promotion policy
merge into main                        -> Vercel and backend deployment
```

The backend workflow automatically:

1. builds the four service images on GitHub;
2. publishes commit-tagged images to GHCR;
3. copies the production Compose and Caddy configuration to the Linode;
4. logs the server in to GHCR and pulls the images;
5. runs Neon migrations;
6. starts Caddy and all four services;
7. verifies that every service is running.

Do not build production images on the Linode and do not run deployment commands
manually during the workflow.

### Verify production

From any machine:

```bash
curl --fail --show-error https://api.resourcehive.thisismalindu.com/health
```

Expected response:

```text
ok
```

On the Linode:

```bash
cd ~/resourcehive
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=100
```

Do not run `docker compose down --volumes` unless you intentionally want to
remove Caddy's stored certificates. Neon data is external and is not deleted by
Docker Compose.
