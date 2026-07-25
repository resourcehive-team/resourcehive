# ResourceHive

**ResourceHive** is a Microservices-Based Multi-Tenant Resource Sharing and Optimization Platform for University Campus Communities. 
This is the internal project for Group 02.

## 🏗️ Architecture

The system uses a four-service backend architecture:
1. **Identity Service** - users, tenants, authentication and roles.
2. **Resource Service** - listings, approval, search, categories and images.
3. **Booking and Transaction Service** - availability, reservations, points, returns and disputes.
4. **Notification Service** - WebSocket/in-app notifications and email fallback.

These services run alongside a **PostgreSQL** database and a **Redis** instance, fronted by an **Nginx** reverse proxy and a **Next.js** frontend.

## 📁 Repository Structure

This project uses a Monorepo strategy managed by `pnpm`. Below is the layout and purpose of each directory:

```text
resourcehive/
├── apps/
│   └── web/                         # The Next.js frontend application (User Interface)
├── services/
│   ├── identity-service/            # NestJS microservice for Auth, Users, Tenants, & Points
│   ├── resource-service/            # NestJS microservice for Resource listings & search
│   ├── booking-service/             # NestJS microservice for Reservations & transactions
│   ├── notification-service/        # NestJS microservice for WebSocket & email alerts
│   └── landing-service/             # Simple landing page container (Dockerized Nginx)
├── packages/
│   └── database/                    # Shared generated Prisma client and NestJS database module
├── db/
│   └── schema/                      # Canonical Prisma schema, migrations, and integrity tests
├── tests/
│   └── e2e/                         # End-to-End integration tests across multiple services
├── .env                             # Root environment variables for Docker Compose
├── .env.example                     # Template for required environment variables
├── docker-compose.yml               # Local development container orchestration
├── package.json                     # Root monorepo scripts
└── pnpm-workspace.yaml              # Monorepo workspace definitions
```

## Local Demo

These steps create a tenant and user, then test the existing login page. You need Node.js 20, pnpm 10.34.5, Docker and Docker Compose. Run every command from the repository root unless a step says otherwise.

1. Install the project dependencies:

   ```bash
   pnpm install
   ```

2. Create the backend environment file:

   ```bash
   cp .env.example .env
   ```

   Open `.env` and replace the placeholder values for `DATABASE_URL` and `JWT_SECRET`. `DATABASE_URL` must be a PostgreSQL connection string with permission to create tables, indexes, triggers, and the `btree_gist` extension. For Neon, use its direct PostgreSQL connection string with `sslmode=require&connect_timeout=30`. Remove `channel_binding=require` because the project's pinned Prisma 5.22 engine cannot connect when that newer libpq option is present. Changing this one value is enough to switch PostgreSQL providers. Keep this file private; Git ignores it.

   The existing authentication implementation also requires `SUPABASE_URL` and `SUPABASE_ANON_KEY`. These are used only by authentication; Supabase is not the database or migration provider.

3. Create the frontend environment file:

   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```

   Its value should be:

   ```env
   NEXT_PUBLIC_IDENTITY_API_URL=http://localhost:3001
   ```

4. Validate and initialize the database:

   ```bash
   pnpm run db:validate
   pnpm run db:init
   ```

   `db:init` applies committed migrations, generates the Prisma client, and builds the shared database package. It is safe to run again because Prisma records applied migrations.

5. Confirm that the configured database is current:

   ```bash
   pnpm run db:migrate:status
   ```

   Prisma should report that the database schema is up to date. Future schema changes should be created with `pnpm run db:migrate:create`; do not use `prisma db push`.

   To run the schema integrity and concurrent-booking tests against an empty disposable database:

   ```bash
   TEST_DATABASE_URL="postgresql://user:password@host:5432/database" \
   pnpm run db:test
   ```

6. Start Redis and the identity service:

   ```bash
   docker compose up identity-service redis
   ```

   The first start can take a little while. Wait for `Nest application successfully started`, then check the API in another terminal:

   ```bash
   curl http://localhost:3001/
   ```

   It should print `Identity Service is running`. Keep Docker Compose running.

7. In a second terminal, start the Next.js frontend:

   ```bash
   pnpm --filter frontend run dev
   ```

8. Check whether the demo user already exists:

   ```bash
   curl -X POST http://localhost:3001/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"demo@example.edu","password":"DemoPassword123!"}'
   ```

   If this returns `user login successfully` and a token, skip the rest of this step. Do not register the same email twice.

   If login fails because this is a new database, create a tenant. A user cannot be registered without one:

   ```bash
   curl -X POST http://localhost:3001/tenants \
     -H "Content-Type: application/json" \
     -d '{"name":"Demo Department","type":"department","domain":"example.edu"}'
   ```

   Copy the `tenant_id` from the response. Register a user with that ID. The email must use the tenant domain (`example.edu` in this example):

   ```bash
   curl -X POST http://localhost:3001/auth/register \
     -H "Content-Type: application/json" \
     -d '{"tenantId":"PASTE_TENANT_ID_HERE","fullName":"Demo User","email":"demo@example.edu","password":"DemoPassword123!"}'
   ```

9. Open the application:

   - Frontend: <http://localhost:3000>
   - Login: <http://localhost:3000/login>
   - Signup: <http://localhost:3000/signup>
   - Identity API: <http://localhost:3001>

   On the login page, enter:

   ```text
   Email: demo@example.edu
   Password: DemoPassword123!
   ```

   A successful login redirects to the home page. You can also test the API directly:

   ```bash
   curl -X POST http://localhost:3001/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"demo@example.edu","password":"DemoPassword123!"}'
   ```

10. Stop the frontend with `Ctrl+C`. Stop the Docker services with:

   ```bash
   docker compose down
   ```

The signup page is not connected to the registration API yet, so use the tenant and registration commands above. After a successful login, the frontend stores the returned token under `resourcehive_access_token` in browser `localStorage`. This is temporary and is not the final production security design.
