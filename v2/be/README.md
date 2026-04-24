# butterstack-be

Bun + Hono + Sequelize backend. Every API lives in its own folder under `src/apis/<module>/<api-name>/` with 7 files (`.function`, `.interface`, `.body.schema`, `.query.schema`, `.test`, `.details`, `.doc.md`). Registration flows through `api.list.ts` → `setup_api`.

## Run

```bash
cd v2/be
bun install
cp .env.example .env              # fill Keycloak + DB creds
createdb butterstack-2
bun migrate                       # umzug applies migrations
bun dev                           # :3000 (auto-migrates on dev boot)
```

OpenAPI doc: `http://localhost:3000/openapi.json`

## Layout

```
src/
├── index.ts              # Boot: migrator → event handlers → APIs → WS
├── env.ts                # Zod-validated env
├── api.list.ts           # Flat array of every ApiDetails
├── ws.list.ts            # Flat array of every WsDetails
│
├── setup/                # Framework layer (no business logic)
│   ├── hono.ts           # OpenAPIHono app + CORS + logger
│   ├── sequelize.ts      # db() factory keyed by DbName
│   ├── keycloak.ts       # OIDC client + PKCE helpers
│   ├── redis.ts          # ioredis + pub/sub
│   ├── session-store.ts  # Redis-backed sessions (7-day TTL)
│   ├── auth-middleware.ts
│   ├── trace-context.ts  # AsyncLocalStorage { trace_id, user_id, project_id }
│   ├── slow-query-logger.ts  # 500ms threshold, JSON emit
│   ├── migrator.ts       # umzug wrapper
│   ├── migrator-cli.ts   # `bun migrate up|down|status`
│   ├── api/              # setup_api + helpers (swagger, validate, send, permissions)
│   └── ws/               # setup_ws + Bun upgrade handler
│
├── config/
│   ├── interfaces/error.interface.ts
│   └── common/activity-log-function.ts
│
├── apis/
│   ├── health/{health-live,health-ready}/
│   ├── auth/{auth-login,auth-callback,auth-me,auth-logout}/
│   ├── events/
│   │   ├── event.types.ts
│   │   ├── dispatcher.ts           # type → handler lookup
│   │   ├── event_list.ts           # flat registry (like api.list.ts)
│   │   ├── handlers/<namespace>/<type>.ts
│   │   ├── post-event/             # POST /api/events — single write surface
│   │   └── get-event/              # GET /api/events/{id}
│   └── projects/{list-projects}/
│
├── ws/
│   ├── project-channel/   # /api/ws?project_id=
│   ├── session-channel/   # /api/ws/sessions/:id
│   └── crdt-channel/      # /api/ws/crdt/:docId
│
└── models/                # Flat Sequelize models, paranoid by default
    ├── user.model.ts
    ├── role.model.ts
    ├── project.model.ts
    ├── project-member.model.ts
    ├── event.model.ts
    ├── project-sequence.model.ts
    └── activity-log.model.ts

migrations/                # Umzug + QueryInterface, number-prefixed
├── 001-extensions.ts
├── 002-roles.ts
├── 003-users.ts
├── 004-projects.ts
├── 005-project-members.ts
├── 006-events.ts
└── 007-activity-log.ts
```

## Conventions (non-negotiable)

1. **Every API is 7 files** under `src/apis/<module>/<api-name>/`. Nothing else lives there.
2. **Business logic lives in `*.function.ts`** — pure function `(data, transaction) => Promise<ExecutionResult | Error_Interface>`. No Hono context. Returns `{ code, message, data?, headers?, cookies? }`.
3. **Single write path** — every mutation is `POST /api/events`. Per-event logic lives in `src/apis/events/handlers/<namespace>/<type>.ts`, registered in `event_list.ts`.
4. **Transactions default to ON for non-GET** methods. Override via `details.uses_transaction`.
5. **Every line of every function is a named helper.** No spaghetti, no inline chaining.
6. **Permissions via `details.required_permissions: string[]`** (AND semantics). Roles table carries `permissions_json` as nested `{ module: { action: bool }}` with `*` wildcard.
7. **All DB access through `db('primary')`** — never `import { Sequelize }` outside `src/setup/`.
8. **Slow queries (≥ `SLOW_QUERY_MS`) are logged** with trace_id/user_id/project_id from `AsyncLocalStorage`.
9. **Soft-delete everywhere** — Sequelize `paranoid: true` default.
10. **Error shape:** `{ error: { code, message, details, trace_id } }`.

## Phase 0 vs planned

| Capability                | Day 1 | Phase 1+ |
|---------------------------|-------|----------|
| Hono + Bun + Sequelize    | ✅    |          |
| Keycloak OIDC + sessions  | ✅    |          |
| Events + dispatcher       | ✅ (4 handlers)  | 107 types per `events-catalog.md` |
| Umzug migrations          | ✅    |          |
| WebSocket (3 channels)    | ✅ (echo)       | Real broadcast + auth + Redis pub/sub wiring |
| AsyncLocalStorage traces  | ✅    |          |
| Slow-query logger         | ✅    |          |
| BullMQ + workers          | ❌    | ✅ |
| AI `invoke_ai()` + prepare_context | ❌ | ✅ |
| Prototype / projections   | ❌    | ✅ (Phase 3) |

## Adding a new API

```bash
mkdir -p src/apis/<module>/<api-name>
```

Create the 7 files mirroring `src/apis/health/health-live/`. Then append to `src/api.list.ts`.

## Adding a new event type

Create `src/apis/events/handlers/<namespace>/<type>.ts` exporting an `EventHandlerDetails` (type, payload zod schema, handler, optional `required_authority_rank`). Append to `src/apis/events/event_list.ts`.
