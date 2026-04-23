# Butterstack V2 — Queue & Workers Architecture

**Decision:** BullMQ (Redis) from Day 1, behind a transport-agnostic `QueueClient` abstraction so we can swap to RabbitMQ without touching producers or workers.

---

## 1. Layering

```
┌──────────────────────────────────────────────────────────┐
│ Producers (routes, event handlers, schedulers)            │
│   → call producer functions only                          │
├──────────────────────────────────────────────────────────┤
│ Producers (be/src/jobs/producers/*.ts)                    │
│   → call queueClient.publish(queueName, jobName, payload) │
├──────────────────────────────────────────────────────────┤
│ QueueClient interface (be/src/jobs/queue-client.ts)       │
│   publish() · consume() · ack() · retry() · scheduleAt()  │
├──────────────────────────────────────────────────────────┤
│ Adapters (be/src/jobs/adapters/)                          │
│   bullmq.adapter.ts   ← Day 1                             │
│   rabbitmq.adapter.ts ← future, drop-in                   │
├──────────────────────────────────────────────────────────┤
│ Worker handlers (be/src/jobs/workers/*.worker.ts)         │
│   pure handler functions, transport-agnostic              │
└──────────────────────────────────────────────────────────┘
```

## 2. Folder layout

```
be/src/jobs/
├── queue-client.ts          # interface + factory
├── queue-registry.ts        # central queue list + worker bindings
├── adapters/
│   ├── bullmq.adapter.ts    # implements QueueClient via BullMQ
│   └── rabbitmq.adapter.ts  # placeholder
├── producers/               # one file per job kind, exposed to app code
│   ├── projection.producer.ts
│   ├── prototype.producer.ts
│   ├── doc-regen.producer.ts
│   ├── export.producer.ts
│   ├── cascade.producer.ts
│   ├── ai-usage.producer.ts
│   └── voice-transcribe.producer.ts
├── workers/                 # one file per worker, named *.worker.ts
│   ├── projection.worker.ts
│   ├── prototype.worker.ts
│   ├── doc-regen.worker.ts
│   ├── export.worker.ts
│   ├── cascade.worker.ts
│   ├── ai-usage.worker.ts
│   └── voice-transcribe.worker.ts
└── schemas/                 # Zod payload schemas per job
    ├── projection.schema.ts
    └── ...
```

## 3. `QueueClient` interface (transport-agnostic)

Methods that every adapter implements:
- `publish(queue, jobName, payload, opts?)` → `jobId`
- `scheduleAt(queue, jobName, payload, runAt, opts?)` → `jobId`
- `consume(queue, handler, concurrency)` → unsubscribe fn
- `ack(jobId)` / `nack(jobId, requeue)`
- `getStatus(jobId)` → typed status

**Rule:** Producers/workers import only `QueueClient` and Zod payload types. They never import `bullmq` or `amqplib`.

## 4. Worker handler shape (functional, line = logical step)

```ts
// be/src/jobs/workers/projection.worker.ts
export const projectionWorker = async (job: Job<ProjectionPayload>) => {
  const event       = await get_event(job.data.eventId);
  const scope       = compute_scope(event);
  const projections = list_affected_projections(scope);
  const results     = await run_projections(projections, event);
  await persist_projection_results(results);
  await broadcast_projection_updates(results);
};
```

Every line a single named helper. Helpers live alongside in a sibling file (`projection.helpers.ts`).

## 5. Queue registry

```ts
// be/src/jobs/queue-registry.ts
export const QUEUES = {
  projection:       'projection',
  prototype:        'prototype',
  docRegen:         'doc-regen',
  export:           'export',
  cascade:          'cascade',
  aiUsage:          'ai-usage',
  voiceTranscribe:  'voice-transcribe',
} as const;

export const WORKER_BINDINGS = [
  { queue: QUEUES.projection,      handler: projectionWorker,      concurrency: 8 },
  { queue: QUEUES.prototype,       handler: prototypeWorker,       concurrency: 4 },
  { queue: QUEUES.docRegen,        handler: docRegenWorker,        concurrency: 6 },
  { queue: QUEUES.export,          handler: exportWorker,          concurrency: 2 },
  { queue: QUEUES.cascade,         handler: cascadeWorker,         concurrency: 4 },
  { queue: QUEUES.aiUsage,         handler: aiUsageWorker,         concurrency: 16 },
  { queue: QUEUES.voiceTranscribe, handler: voiceTranscribeWorker, concurrency: 2 },
];
```

## 6. Operational concerns

- **Idempotency:** every job carries `idempotencyKey` (often the source `eventId`); adapter dedupes.
- **Retries:** exponential backoff (`attempts: 5`, base 2s).
- **Dead-letter:** failed jobs after max retries → `failed_jobs` table + alert.
- **Observability:** every job logs `jobId`, `queue`, `duration`, `attempt`, `outcome`, `traceId`.
- **Graceful shutdown:** SIGTERM → stop consuming, drain in-flight, exit.

## 7. Day-1 vs future

| Concern | Day 1 | Future |
|---------|-------|--------|
| Transport | BullMQ + Redis | RabbitMQ (swap adapter) |
| Worker process | In-band with API (single Bun process) | Separate `worker` Bun process per queue group |
| Schedules | BullMQ delayed jobs | Same, plus cron via `@hono/cron` or external scheduler |
