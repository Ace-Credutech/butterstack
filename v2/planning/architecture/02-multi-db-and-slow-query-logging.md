# Butterstack V2 — Multi-DB Access & Slow-Query Logging

**Decision:** Even though V2 ships with a single Postgres (`butterstack-2`), all DB access goes through a `db()` factory keyed by logical DB name. Slow-query logging at 500ms is mandatory from Day 1.

---

## 1. Why multi-DB capable from Day 1

- Future: per-tenant sharding, read-replicas, separate analytics DB, audit log on its own cluster.
- Code that hard-imports a single PrismaClient cannot be refactored cheaply later.
- One indirection layer = future-proof, near-zero overhead today.

## 2. The `db()` factory

```ts
// be/src/db/index.ts
type DbName = 'primary' | 'analytics' | 'audit';   // grow as needed

const clients = new Map<DbName, PrismaClient>();

export function db(name: DbName = 'primary'): PrismaClient {
  const cached = clients.get(name);
  if (cached) return cached;
  const client = build_prisma_client(name);
  attach_slow_query_logger(client, name);
  clients.set(name, client);
  return client;
}
```

**Rule:** No file outside `be/src/db/` may `import { PrismaClient }`. Always `import { db } from '@/db'` and call `db('primary')`.

## 3. Connection config

```
# .env
DATABASE_URL_PRIMARY=postgres://.../butterstack-2
DATABASE_URL_ANALYTICS=             # blank → falls back to primary
DATABASE_URL_AUDIT=                 # blank → falls back to primary
SLOW_QUERY_MS=500
```

`build_prisma_client(name)` reads the matching env var, falls back to `DATABASE_URL_PRIMARY` if the named one is empty (so single-DB deploys "just work").

## 4. Slow-query logging

```ts
// be/src/db/slow-query-logger.ts
export const attach_slow_query_logger = (client: PrismaClient, dbName: DbName) => {
  client.$use(async (params, next) => {
    const startedAt = performance.now();
    const result    = await next(params);
    const duration  = performance.now() - startedAt;
    if (duration >= slow_threshold_ms()) emit_slow_query_log(params, duration, dbName);
    return result;
  });
};
```

**Every slow query log includes:**
- `dbName`
- `model` + `action` (Prisma) or `sql` (raw)
- `paramsRedacted` (PII stripped via redactor)
- `durationMs`
- `caller` (file:line from `Error.stack`)
- `traceId` (from request context via AsyncLocalStorage)
- `userId`, `projectId` if available

Logs go to:
- stdout in JSON
- `slow_queries` table in `audit` DB (async, non-blocking)
- Alert if p95 > 2s in any 5-min window

## 5. Raw SQL path

If anyone bypasses Prisma (e.g., for `LISTEN/NOTIFY` via `postgres`), the same wrapper applies:

```ts
// be/src/db/raw.ts
export const raw_query = async (dbName: DbName, sql: string, params: unknown[]) => {
  const startedAt = performance.now();
  const rows      = await get_pool(dbName).unsafe(sql, params);
  const duration  = performance.now() - startedAt;
  if (duration >= slow_threshold_ms()) emit_slow_query_log_raw(sql, params, duration, dbName);
  return rows;
};
```

## 6. Folder layout

```
be/src/db/
├── index.ts                  # db() factory + DbName type
├── slow-query-logger.ts      # Prisma $use middleware
├── raw.ts                    # raw SQL wrapper for non-Prisma paths
├── redact.ts                 # param/SQL redaction
└── trace-context.ts          # AsyncLocalStorage for traceId/userId/projectId
```

## 7. Functional code style applied

```ts
// example route handler
export const get_feature_handler = async (c) => {
  const featureId = parse_feature_id(c);
  const ctx       = build_request_context(c);
  const feature   = await load_feature(ctx, featureId);
  const tokens    = await load_feature_tokens(ctx, featureId);
  const pages     = await load_linked_pages(ctx, featureId);
  return c.json(compose_feature_view(feature, tokens, pages));
};
```

Each line: one named operation. Helpers live in `be/src/features/feature.queries.ts`.

## 8. Cross-cutting rules (added to global rules)

8. **Never `import PrismaClient` outside `be/src/db/`.** Always `db('primary')`.
9. **All slow queries (≥500ms) MUST be logged** with full context. Threshold via `SLOW_QUERY_MS` env.
10. **All code is functional.** Each line of a function is one logical step calling a named helper. Orchestrators do not contain logic — they compose.
