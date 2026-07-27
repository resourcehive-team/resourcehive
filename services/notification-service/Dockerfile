FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
RUN npm install -g pnpm@10.34.5
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @resourcehive/database run build
RUN pnpm --filter notification-service run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
RUN npm install -g pnpm@10.34.5
ENV NODE_ENV=production
COPY --from=builder /app /app
EXPOSE 3003
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3003/health || exit 1
CMD ["pnpm", "--filter", "notification-service", "run", "start:prod"]
