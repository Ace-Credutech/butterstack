# Health — Ready

1. Checks all critical dependencies: primary DB, Redis, storage
2. Returns 200 with `{ status: 'ready', deps: {...} }` when all are OK
3. Returns 503 with dependency diagnostics when anything is down
4. Public (no auth)

### Test Cases

1. Returns 200 or 503 with `deps` populated — Done
