# Auth — Login (Password Grant)

1. Body `{ email, password }` → calls Keycloak token endpoint with `grant_type=password`
2. Verifies returned access_token against Keycloak JWKS
3. Upserts user in DB (id = keycloak `sub`)
4. Returns `{ access_token, refresh_token, expires_in, user }`

### Test Cases

1. Invalid credentials → 401 — Done
2. Valid credentials → 200 + tokens + user — TODO (needs test user)
