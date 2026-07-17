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

# Production Runner Stage
FROM node:20-alpine AS runner
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy the entire built application from the builder stage
# This ensures the generated Prisma client in node_modules/.prisma is preserved
COPY --from=builder /app /app

# Expose the port the NestJS app runs on
EXPOSE 3000

# Start the application using the production build
CMD ["pnpm", "--filter", "identity-service", "run", "start:prod"]
