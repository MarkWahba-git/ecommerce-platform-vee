# Vee Platform Architecture

## System Overview

```
[Browser] --> [Vercel Edge / CDN]
                    |
            [Next.js Storefront App]  ----> [PostgreSQL]
            [Next.js Admin App]       ----> [Redis]
                    |                       [S3/R2]
            [API Route Handlers]            [Meilisearch]
                    |
            [Service Layer (packages/core)]
                    |
            [BullMQ Workers] ----> [Etsy API]
                                   [Amazon SP-API]
                                   [DHL API]
                                   [Stripe API]
                                   [Resend API]
```

## Key Design Decisions

1. **REST for storefront, tRPC for admin** — Storefront APIs are cacheable at CDN edge. Admin uses tRPC for end-to-end type safety.

2. **Separate Next.js apps** — Different auth contexts, deployment strategies, and security profiles.

3. **Worker as separate process** — BullMQ workers need persistent connections and scheduled execution, incompatible with serverless.

4. **Shared pool inventory (MVP)** — All channels see same stock minus safety buffer. Per-channel allocation deferred to Phase 3.

5. **Prisma ORM** — Mature migration tooling, type-safe queries, good ecosystem.

6. **Meilisearch** — Self-hostable, cost-efficient, excellent relevancy for product search.

## Service Layer

All business logic lives in `packages/core/src/services/`. Both apps import from it. Services receive dependencies via constructor parameters.

## Marketplace Connector Pattern

All marketplace integrations implement the `ChannelConnector` interface defined in `packages/core/src/connectors/channel-connector.interface.ts`. This allows adding new channels without modifying core logic.

## Data Flow

- **Product creation**: Admin → tRPC → ProductService → PostgreSQL + Meilisearch index
- **Storefront browse**: Browser → Next.js ISR → REST API → ProductService → PostgreSQL (cached)
- **Checkout**: Browser → REST API → CartService → OrderService → Stripe → PaymentService
- **Marketplace sync**: BullMQ Worker → ChannelConnector → External API
- **Order import**: Webhook/Poll → Worker → OrderService.createFromMarketplace()
