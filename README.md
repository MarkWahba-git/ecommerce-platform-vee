# Vee — Multi-Channel Handmade Commerce Platform

A production-ready eCommerce platform for **Vee**, a handmade brand selling physical, digital, and personalized products across its own website, Etsy, and Amazon.

## Architecture

- **Monorepo** with Turborepo + pnpm
- **Storefront**: Next.js 15 App Router (SSR/SSG/ISR for SEO)
- **Admin Dashboard**: Next.js 15 App Router + tRPC
- **Database**: PostgreSQL 16 + Prisma ORM
- **Queue Workers**: BullMQ + Redis
- **Search**: Meilisearch
- **Payments**: Stripe
- **File Storage**: S3-compatible (Cloudflare R2)
- **Email**: Resend + React Email

## Project Structure

```
apps/
  storefront/     # Customer-facing website (port 3000)
  admin/          # Admin dashboard (port 3001)
  worker/         # BullMQ background workers

packages/
  db/             # Prisma schema, migrations, client
  shared/         # Types, Zod schemas, constants, utilities
  core/           # Business logic services, connectors, jobs
  ui/             # Shared UI components (shadcn/ui)
  email-templates/ # React Email templates

tooling/
  eslint/         # Shared ESLint config
  typescript/     # Shared TypeScript configs
  prettier/       # Shared Prettier config
```

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker (for local PostgreSQL, Redis, Meilisearch)

### Setup

```bash
# Install dependencies
pnpm install

# Start infrastructure
docker compose up -d

# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Seed database
pnpm db:seed

# Start development
pnpm dev
```

### Environment Variables

Copy `.env.example` to `.env` and configure your values:

```bash
cp .env.example .env
```

## Product Types

| Type | Description |
|------|-------------|
| **Physical** | Handmade products with inventory, variants, shipping |
| **Digital** | Downloadable products with secure delivery |
| **Personalized** | Custom products with customer input fields |

## Marketplace Integration

Vee is the central source of truth. Products, inventory, and orders sync to/from:

- **Etsy** (Phase 2)
- **Amazon** (Phase 3)
- Future channels via the `ChannelConnector` interface

## License

Private — All rights reserved.
