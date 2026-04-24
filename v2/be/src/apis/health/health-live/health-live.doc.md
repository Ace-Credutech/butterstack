# Health — Live

1. Kubernetes-style process liveness probe
2. Returns 200 with `{ status: 'live' }` as long as the process is running
3. No DB or Redis or storage checks — use `/api/health/ready` for that
4. Public (no auth)

### Test Cases

1. Returns `code: 200` — Done
