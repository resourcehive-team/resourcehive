# Builder Stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm and openssl (required for Prisma engine detection on Alpine)
RUN apk add --no-cache openssl
RUN npm install -g pnpm@10.34.5

# Copy all workspace files
COPY . .

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Generate the Prisma client and build the database package.
RUN pnpm --filter @resourcehive/database run build

# Build the identity-service
RUN pnpm --filter identity-service run build

# Production Runner Stage
FROM node:20-alpine AS runner
WORKDIR /app

# Install pnpm and openssl (required for Prisma runtime on Alpine)
RUN apk add --no-cache openssl
RUN npm install -g pnpm@10.34.5

# Copy the entire built application from the builder stage
# This ensures the generated Prisma client in node_modules/.prisma is preserved
COPY --from=builder /app /app

# Expose the port the NestJS app runs on
EXPOSE 3000

# Start the application using the production build
CMD ["pnpm", "--filter", "identity-service", "run", "start:prod"]
