FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# ── Builder ───────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Install dependencies using lockfile at monorepo root
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY apps/storefront/package.json ./apps/storefront/package.json
COPY apps/admin/package.json ./apps/admin/package.json
COPY apps/worker/package.json ./apps/worker/package.json
COPY packages/core/package.json ./packages/core/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/email-templates/package.json ./packages/email-templates/package.json
COPY tooling/ ./tooling/
RUN pnpm install --frozen-lockfile

# Copy full source
COPY . .

# Generate Prisma client (does not need DATABASE_URL)
RUN pnpm --filter @vee/db exec prisma generate

# Build storefront only
RUN pnpm turbo run build --filter=storefront

# ── Runner ────────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Standalone output includes server.js nested under monorepo path when
# outputFileTracingRoot is set to the monorepo root
COPY --from=builder --chown=nextjs:nodejs /app/apps/storefront/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/storefront/.next/static ./apps/storefront/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/storefront/server.js"]
