# Auth — Refresh

1. Body `{ refresh_token }`
2. Exchanges for a new access+refresh pair (Keycloak refresh_token grant with rotation)
3. Returns `{ access_token, refresh_token, expires_in }`

### Test Cases

1. Invalid refresh token → 400/401 — Done
