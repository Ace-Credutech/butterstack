# Events — Post Event

1. Single write surface for **every** mutation in the system
2. Body = typed event envelope `{ type, payload, scope, source, idempotency_key, expected_version?, override_target_event_id?, event_version? }`
3. `scope.project_id` is required; event type is looked up in the dispatcher registry
4. Server assigns monotonic `sequence_no` per project, returned in body + `X-Sequence-No` header
5. Idempotency — repeat requests with the same `idempotency_key` return the original response (within the same project)

### Test Cases

1. Unknown event type → 422 — Done
2. Valid `project.create` → event persisted, project row created — TODO (needs fixture user + project scope)
3. Duplicate idempotency key with different type → 409 — TODO
4. Duplicate idempotency key with same type → 200 replay of original — TODO

### Internal Work

- Envelope validated by Zod here; **payload** validated by the handler's own schema inside `dispatcher.ts`
- Sequence assigned from `project_sequences.last_seq` (row-locked within the open transaction — needs a `.findByPk({ lock: true })` pass)
- Event row written AFTER handler returns success, carrying `affected_entities_json` computed by the handler
- Handler's `jobs_to_enqueue` (Phase 1) will enqueue to BullMQ queues; for now ignored
