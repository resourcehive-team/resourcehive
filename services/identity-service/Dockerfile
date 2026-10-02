# syntax=docker/dockerfile:1

FROM node:22.23.2-alpine3.24 AS base
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
COPY services/identity-service/package.json services/identity-service/package.json
RUN --mount=type=cache,id=resourcehive-pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile --filter identity-service...

COPY db db
COPY packages/database packages/database
RUN printf '%s\n' \
    'DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build' \
    'DATABASE_URL_UNPOOLED=postgresql://build:build@127.0.0.1:5432/build' > .env
RUN pnpm --filter @resourcehive/database run build

RUN --mount=type=cache,id=resourcehive-pnpm,target=/pnpm/store \
    pnpm --prefer-offline --filter @resourcehive/database deploy /prod/migrator && \
    cp -R db/schema /prod/migrator/schema

COPY packages/service-auth packages/service-auth
RUN pnpm --filter @resourcehive/service-auth run build

COPY packages/notification-client packages/notification-client
RUN pnpm --filter @resourcehive/notification-client run build

COPY services/identity-service services/identity-service
RUN pnpm --filter identity-service run build
RUN pnpm --filter identity-service exec tsc \
    --target ES2021 \
    --module commonjs \
    --moduleResolution node \
    --esModuleInterop \
    --skipLibCheck \
    --strictNullChecks false \
    --noImplicitAny false \
    --outDir dist/scripts \
    --rootDir scripts \
    scripts/seed-university.ts scripts/setup-runtime-roles.ts

RUN --mount=type=cache,id=resourcehive-pnpm,target=/pnpm/store \
    pnpm --prefer-offline --filter identity-service --prod deploy /prod/service

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder --chown=node:node /prod/service ./
COPY --from=builder --chown=node:node /prod/migrator /migrator
EXPOSE 3000
USER node
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
    CMD wget -qO- http://127.0.0.1:3000/ || exit 1
CMD ["node", "dist/main.js"]
