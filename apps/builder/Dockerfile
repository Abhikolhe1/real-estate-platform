# syntax=docker/dockerfile:1

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/builder/package.json ./apps/builder/
COPY packages/scene-compiler/package.json ./packages/scene-compiler/
COPY packages/config/package.json ./packages/config/
COPY packages/ui/package.json ./packages/ui/
COPY packages/twin-schema/package.json ./packages/twin-schema/

RUN npm ci --include-workspace-root

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY packages ./packages
COPY apps/builder ./apps/builder

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build --workspace=apps/builder

# Stage 3: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3003
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/builder/public ./apps/builder/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/builder/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/builder/.next/static ./apps/builder/.next/static

USER nextjs

EXPOSE 3003

CMD ["node", "apps/builder/server.js"]
