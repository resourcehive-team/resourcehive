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
│   └── database/                    # Shared Prisma schema, migrations, and database client
├── tests/
│   └── e2e/                         # End-to-End integration tests across multiple services
├── .env                             # Root environment variables for Docker Compose
├── .env.example                     # Template for required environment variables
├── docker-compose.yml               # Local development container orchestration
├── package.json                     # Root monorepo scripts
└── pnpm-workspace.yaml              # Monorepo workspace definitions
```

## Local Demo

You need Node.js, pnpm, Docker and Docker Compose installed. Run the following commands from the repository root.

1. Install the project dependencies:

   ```bash
   pnpm install
   ```

2. Create the backend environment file and fill in the database connection and secrets:

   ```bash
   cp .env.example .env
   ```

3. Create the frontend environment file:

   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```

4. Generate the Prisma client:

   ```bash
   pnpm --filter @resourcehive/database run generate
   ```

5. Apply the Prisma schema to the database configured in `.env`:

   ```bash
   pnpm --filter @resourcehive/database run push
   ```

6. Start Redis and the identity service:

   ```bash
   docker compose up identity-service redis
   ```

7. In a second terminal, start the Next.js frontend:

   ```bash
   pnpm --filter frontend run dev
   ```

8. Open the application:

   - Frontend: <http://localhost:3000>
   - Login: <http://localhost:3000/login>
   - Signup: <http://localhost:3000/signup>
   - Identity API: <http://localhost:3001>

9. Stop the frontend with `Ctrl+C`. Stop the Docker services with:

   ```bash
   docker compose down
   ```

The signup page is not connected to the registration API yet. You may need to create a user through `POST /auth/register` before testing login. Replace the tenant ID below with one that exists in your database:

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"replace-with-tenant-id","fullName":"Demo User","email":"demo@example.edu","password":"DemoPassword123!"}'
```

After a successful login, the frontend stores the access token in browser `localStorage`. This is a temporary development approach, not the final production security design.
