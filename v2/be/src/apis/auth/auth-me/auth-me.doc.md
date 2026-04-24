# Auth — Me

1. Returns currently authenticated user, or `{ authenticated: false }` when not signed in
2. Never 401 — FE uses this to decide whether to show login CTA

### Test Cases

1. No session cookie → `authenticated: false` — Done
2. Valid session → returns user with id/email/name/role — TODO
