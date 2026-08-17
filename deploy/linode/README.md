# Deploy the ResourceHive backend to a Linode

ResourceHive uses three deployment targets:

```text
resourcehive.thisismalindu.com      marketing site on Vercel
app.resourcehive.thisismalindu.com  Next.js application on Vercel
api.resourcehive.thisismalindu.com  Caddy + four NestJS services on Linode
                                      |
                                      +-- Neon PostgreSQL
```

Only Caddy publishes host ports. The NestJS services communicate over Docker's
private network. GitHub Actions builds the service images; the 2 GB Linode only
pulls and runs them.

Caddy is not a Linode service. It is a portable open-source reverse proxy in an
official Docker image, so the same Compose deployment can move to another Linux
VM without changing application code.

## What happens automatically

A push to `main` triggers the backend deployment workflow. It:

1. builds the four service images in GitHub Actions;
2. tags them with the exact Git commit and publishes them to GHCR;
3. copies `docker-compose.prod.yml` and the Caddyfile to the Linode;
4. logs the Linode in to GHCR;
5. pulls the prebuilt images;
6. runs committed Prisma migrations against Neon;
7. starts the services and waits for their health checks.

The server needs a one-time bootstrap before this automation can work.

## DNS

Create these records with the DNS provider for `thisismalindu.com`:

| Host | Destination |
| --- | --- |
| `resourcehive` | Marketing Vercel project (when that project exists) |
| `app.resourcehive` | Application Vercel project |
| `api.resourcehive` | Linode public IPv4 address (`A` record) |

Use the exact Vercel record values shown in each Vercel project's Domains page.
Do not add an `AAAA` record for the API unless IPv6 is configured on the Linode.

## One-time Linode bootstrap

The examples below assume Ubuntu and a non-root deployment user that can run
Docker. Install Docker Engine and the Docker Compose plugin using Docker's
official Ubuntu instructions, then verify:

```bash
docker --version
docker compose version
```

Create the deployment directory:

```bash
mkdir -p ~/resourcehive
cd ~/resourcehive
```

Copy the production example from the repository to the server as
`.env.production`, then edit every placeholder:

```bash
chmod 600 .env.production
nano .env.production
```

Generate the JWT secret with:

```bash
openssl rand -base64 48
```

Use Neon's pooled connection for `DATABASE_URL` and its direct connection for
`DATABASE_URL_UNPOOLED`. If only one connection is available, use it for both.

Because the Linode has 2 GB RAM, a 1 GB swap file provides emergency headroom:

```bash
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Do this only once. Check for existing swap first with `swapon --show`.

## Firewall

Allow inbound traffic for:

- TCP 22 from trusted administrator IP addresses;
- TCP 80 and 443 from the internet;
- UDP 443 from the internet for HTTP/3.

Do not expose service ports 3000, 3002, 3003, or 3004. Caddy automatically
obtains and renews the API certificate after DNS resolves and ports 80/443 are
reachable.

## GitHub repository secrets

Add these Actions secrets:

| Secret | Value |
| --- | --- |
| `LINODE_HOST` | Linode IP address or SSH hostname |
| `LINODE_USERNAME` | Non-root deployment user |
| `LINODE_SSH_PRIVATE_KEY` | Private key authorized for that user |
| `LINODE_SSH_KNOWN_HOSTS` | Verified SSH host-key entry for the Linode |

The workflow uses its short-lived `GITHUB_TOKEN` to pull the images during the
deployment, so no long-lived GHCR token needs to be stored on the Linode.

Obtain a known-hosts entry from a trusted machine with:

```bash
ssh-keyscan -H YOUR_LINODE_IP
```

Compare its fingerprint with the Linode before saving it as a secret. The
deployment refuses unknown or changed host keys.

The workflow targets the `production` GitHub Environment. Create that
environment if you want approval rules or environment-scoped secrets.

## Vercel application project

Import the repository into Vercel with `apps/web` as the Root Directory. Set:

```env
NEXT_PUBLIC_API_URL=https://api.resourcehive.thisismalindu.com
JWT_SECRET=the_same_secret_used_by_the_backend
```

`NEXT_PUBLIC_API_URL` is intentionally public. `JWT_SECRET` is server-only and
must not use the `NEXT_PUBLIC_` prefix. It is required by the current Next.js
proxy, which validates the access-token cookie before serving protected routes.

Assign `app.resourcehive.thisismalindu.com` to this Vercel project. The
repository does not currently contain `apps/marketing`, so the marketing domain
cannot be deployed from this monorepo until that application exists.

## First and later deployments

After DNS, the server env file, and GitHub secrets are ready, open a pull request
from `dev` into `main`. Merging that pull request starts the production backend
deployment.

No SSH session is normally required for later deployments.

## Verify and troubleshoot

From any machine:

```bash
curl --fail --show-error https://api.resourcehive.thisismalindu.com/health
```

On the Linode:

```bash
cd ~/resourcehive
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=100 api-gateway identity-service
free -h
docker system df
```

Follow logs with:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f
```

Do not run `docker compose build` on the Linode. Production Compose deliberately
contains only `image:` references for the application services.

Do not use `docker compose down --volumes` unless you intentionally want to
delete Caddy's locally stored certificates. Neon data is external and is never
deleted by Compose.
