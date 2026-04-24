# Auth — Register

1. Body `{ email, password, first_name?, last_name? }`
2. Calls Keycloak admin API to create the user (requires `KEYCLOAK_ADMIN_USER` + `KEYCLOAK_ADMIN_PASSWORD`)
3. Immediately password-logs-in the new user
4. Upserts into our DB with `id = keycloak_sub`
5. Returns `{ access_token, refresh_token, user }`

### Test Cases

1. Weak password (<8 chars) → 400 — Done
2. Duplicate email → 409 — TODO
3. Happy path → 201 + tokens + user — TODO
