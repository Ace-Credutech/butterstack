# Projects — List Projects

1. Returns projects owned by the current user
2. Cursor pagination by `created_at` DESC; `next_cursor` base64url-encoded ISO date
3. Default `limit=50`, max 200
4. Requires permission `projects.list`

### Test Cases

1. Unauthenticated → 401 — Done
2. With no projects → empty `items`, null `next_cursor` — TODO
3. With pagination cursor → subsequent page — TODO

### Internal Work

- Use cursor over `created_at` (append-only semantics; no stable id ordering)
- Paranoid soft-delete filter applied automatically by Sequelize
