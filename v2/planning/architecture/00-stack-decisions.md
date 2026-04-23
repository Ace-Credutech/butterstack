# Butterstack V2 — Stack & Architectural Decisions

**Status:** Draft for review. Aligns with `Butterstack_V2_PRD.md §3`.

---

## 1. Stack (locked)

| Layer | Choice | Notes |
|-------|--------|-------|
| Backend runtime | **Bun 1.x** | Single binary, fast cold start, native TS, built-in test runner |
| HTTP framework | **Hono** | Edge-friendly, tiny, excellent TS DX |
| Schema authoring | **Prisma** (`schema.prisma`) — source of truth | Declarative, ER diagram via `prisma-erd-generator`, migration diffing |
| DB client at runtime | **Prisma Client** (Bun-compatible) | Use Prisma both at design time and runtime — one source of types |
| DB | **PostgreSQL** (`butterstack-2`) | Plus extensions: `pg_trgm`, `uuid-ossp`, optionally `pgmq` for jobs |
| Validation | **Zod** on every route in/out | Shared types via inference |
| API contract | **`@hono/zod-openapi`** → OpenAPI JSON | FE client generated via `openapi-typescript` |
| Frontend | **Angular 19 standalone + Signals** | No NgModules, no NgRx |
| Real-time | **WebSocket (Bun native) + Yjs** | True CRDT collab |
| Voice | **Whisper** (push-to-talk, streaming) | EN + Hinglish V1 |
| Auth | **Keycloak (OIDC)** | `openid-client` on Bun |
| AI | Multi-provider router (OpenRouter, Minmax, Claude Max, direct OpenAI/Anthropic) | Unified client wrapper |
| Job queue | **Postgres-backed `jobs` table** (poll + LISTEN/NOTIFY) | Upgrade to `pgmq` if needed |
| Deployment | Coolify (single server) | |

## 2. Why Prisma even with Bun

- **Declarative schema** — one `.prisma` file = full ER model + relations + indexes + enums.
- **Migration diffing** — `prisma migrate dev` writes idempotent SQL files; `prisma migrate deploy` runs them in prod.
- **Visual ERD** — `prisma-erd-generator` outputs Mermaid/SVG on every change.
- **Type-safe runtime** — `PrismaClient` gives FE-grade autocomplete inside Bun handlers.
- **One source of truth** for shape: Prisma model → backend types → Zod schemas (via `zod-prisma-types`) → OpenAPI → FE TS types.

**Flow:**
```
schema.prisma  ─(prisma generate)─▶  PrismaClient + types
       │
       ├─(prisma migrate dev)──▶ prisma/migrations/*.sql ──(deploy)──▶ butterstack-2
       │
       └─(zod-prisma-types)────▶ generated Zod schemas ─▶ Hono routes ─▶ OpenAPI ─▶ FE client
```

## 3. Repo layout

```
v2/
├── be/                          # Bun + Hono
│   ├── package.json
│   ├── bun.lockb
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts             # Hono app bootstrap
│   │   ├── env.ts               # typed env loader
│   │   ├── db.ts                # PrismaClient singleton
│   │   ├── auth/                # Keycloak OIDC middleware
│   │   ├── domain/              # pure types: Event union, StructuredDoc, Block, Context
│   │   ├── events/              # dispatcher, handlers, projector
│   │   ├── ai/                  # multi-provider client, prompts/, streamline, classify, plan
│   │   ├── routes/              # thin Hono handlers (Zod-validated)
│   │   ├── jobs/                # queue + runners + steps/
│   │   ├── ws/                  # WebSocket + Yjs
│   │   └── openapi.ts           # OpenAPI doc emit
│   └── tests/
│
├── fe/                          # Angular 19 standalone
│   ├── angular.json
│   ├── package.json
│   └── src/app/
│       ├── pages/
│       ├── components/
│       ├── editor/              # custom block engine (contenteditable + yjs)
│       ├── renderers/           # Block → HTML
│       ├── iframe/              # prototype runtime
│       ├── api/generated/       # from OpenAPI
│       ├── state/               # signal stores
│       └── domain/              # mirrors be types via codegen
│
├── prisma/                      # schema + migrations (single source of truth)
│   ├── schema.prisma
│   ├── migrations/
│   └── package.json             # prisma + zod-prisma-types + erd-generator
│
└── planning/
    ├── architecture/
    ├── api/
    ├── schema/
    ├── Butterstack_V2_PRD.md
    ├── flow-of-information.md
    └── master-plan.md
```

## 4. Cross-cutting rules (non-negotiable)

1. **Single write path**: all mutations via `POST /api/events`.
2. **Prisma is the schema source of truth** — never edit `migrations/*.sql` by hand; always edit `schema.prisma` and generate.
3. **OpenAPI-first for reads**: every GET registered via `@hono/zod-openapi` → FE regenerates client on contract change.
4. **Events are part of the contract** — the `Event` discriminated union has a Zod schema published in OpenAPI for FE parity.
5. **Migrations are additive** until GA. No destructive migrations in dev without explicit approval.
6. **Every table has `createdAt`, `updatedAt`** unless append-only (events, messages) — then `createdAt` only.
7. **UUIDs everywhere** (`@default(uuid())` in Prisma) — prevents ID leakage, safe for offline CRDT merges.

## 5. Open questions before Phase 0

| # | Question | Why it matters |
|---|----------|----------------|
| A-1 | Prisma Client at runtime, or Prisma for schema only + raw SQL via `postgres`/`bun:sql`? | Prisma Client is convenient but adds binary weight; raw SQL is fastest |
| A-2 | Job queue: plain `jobs` table + LISTEN/NOTIFY vs `pgmq` extension vs BullMQ-on-Redis? | Adds infra surface |
| A-3 | CRDT storage: Yjs binary updates in `Bytes` column vs object store? | Binary in pg fine until GB-scale docs |
| A-4 | Monorepo tool: Bun workspaces only, or `nx` for FE/BE coordination? | nx adds overhead; Bun workspaces likely sufficient |
| A-5 | OpenAPI generator on FE: `openapi-typescript` (types only) vs `orval` (full client + signals adapter)? | |
| A-6 | Confidence model P-1 (still pending from PRD) | Affects `confidence_scores` schema |

**Recommendation going in:** Prisma (schema + client) + Bun workspaces + `jobs` table with LISTEN/NOTIFY + `openapi-typescript` + Hono + Zod. Lowest dependency surface.
