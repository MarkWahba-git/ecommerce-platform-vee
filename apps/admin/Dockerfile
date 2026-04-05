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

# Build admin only
RUN pnpm turbo run build --filter=admin

# ── Runner ────────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/static ./apps/admin/.next/static

USER nextjs
EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/admin/server.js"]
