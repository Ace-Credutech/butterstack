# Auth — Logout

1. Clears the signed session cookie
2. Deletes the Redis session entry (TODO — needs session id passed through middleware)
3. Returns `{ authenticated: false }`

### Test Cases

1. Clears cookie, returns 200 — Done
