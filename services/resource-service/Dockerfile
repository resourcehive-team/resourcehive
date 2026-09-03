# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

FROM base AS builder
RUN npm install -g pnpm@10.34.5

# Install only this service and its workspace dependencies. Source changes do
# not invalidate this layer.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/database/package.json packages/database/package.json
COPY packages/service-auth/package.json packages/service-auth/package.json
COPY services/resource-service/package.json services/resource-service/package.json
RUN --mount=type=cache,id=resourcehive-pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile --filter resource-service...

COPY db db
COPY packages/database packages/database
RUN pnpm --filter @resourcehive/database run build

COPY packages/service-auth packages/service-auth
RUN pnpm --filter @resourcehive/service-auth run build

COPY services/resource-service services/resource-service
RUN pnpm --filter resource-service run build
RUN --mount=type=cache,id=resourcehive-pnpm,target=/pnpm/store \
    pnpm --prefer-offline --filter resource-service --prod deploy /prod/service

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /prod/service ./
EXPOSE 3004
CMD ["node", "dist/main.js"]
