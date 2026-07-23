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

## 🚀 Project Setup (Local Development)

The entire backend infrastructure can be spun up using Docker Compose.

1. Ensure you have Docker and Docker Compose installed.
2. Ensure you have copied `.env.example` to `.env`.
3. At the root of the repository, run:
   ```bash
   docker-compose up -d --build
   ```
