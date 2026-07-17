# Builder Stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy all workspace files
COPY . .

# Install all dependencies
RUN pnpm install

# Generate the Prisma Client for Linux
RUN pnpm --filter @resourcehive/database run generate

# Build the database package
RUN pnpm --filter @resourcehive/database run build

# Build the identity-service
RUN pnpm --filter identity-service run build

# Deploy the identity-service to a clean folder for production
RUN pnpm --filter identity-service --prod deploy --legacy /pruned

# Production Runner Stage
FROM node:20-alpine AS runner
WORKDIR /app

# Copy the deployed application from the builder stage
COPY --from=builder /pruned /app

# Expose the port the NestJS app runs on
EXPOSE 3000

# Start the application using the production build
CMD ["node", "dist/main"]
