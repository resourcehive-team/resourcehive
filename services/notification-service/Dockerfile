# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

FROM base AS builder
RUN npm install -g pnpm@10.34.5

# Install only this service and its workspace dependencies.
# Source changes do not invalidate this layer.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/database/package.json packages/database/package.json
COPY packages/service-auth/package.json packages/service-auth/package.json
COPY packages/notification-client/package.json packages/notification-client/package.json
COPY services/notification-service/package.json services/notification-service/package.json
RUN --mount=type=cache,id=resourcehive-pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile --filter notification-service...

COPY db db
COPY packages/database packages/database
RUN pnpm --filter @resourcehive/database run build

COPY packages/service-auth packages/service-auth
RUN pnpm --filter @resourcehive/service-auth run build

COPY packages/notification-client packages/notification-client
RUN pnpm --filter @resourcehive/notification-client run build

COPY services/notification-service services/notification-service
RUN pnpm --filter notification-service run build

RUN --mount=type=cache,id=resourcehive-pnpm,target=/pnpm/store \
    pnpm --prefer-offline --filter notification-service --prod deploy /prod/service

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /prod/service ./
EXPOSE 3003
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3003/health || exit 1
CMD ["node", "dist/main.js"]