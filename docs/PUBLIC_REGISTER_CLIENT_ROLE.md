# Public register-client role lock (AUTH-P0-01)

**When to use:** Someone claims `POST /api/auth/register-client` can create admins via `isAdmin` / `role`; first-tenant bootstrap is confused with customer signup; debugging unexpected `users.role` after public registration.

Verified against source (Sep 2026). Commit `2caf1857` (#195). Complementary: draft tenant-authz runbooks (#191 / PR #193) cover API session gates — this page is only about **public customer registration role minting**.

---

## Intent

Public customer registration uses the **service-role** client to insert/update `users`. That bypasses RLS, so **request body fields are not an authorization boundary**. After #195, this endpoint may only mint the unprivileged role `client`.

First-tenant / firm admin bootstrap is a **separate** HMAC-gated flow:

1. `POST /api/tenants/register`
2. `POST /api/tenants/create-admin` (requires `registration_token` verified by `verifyRegistrationToken`)

Staff accounts use invitation registration (`POST /api/staff/register`), not `register-client`. See [STAFF_INVITATION_REGISTRATION.md](./STAFF_INVITATION_REGISTRATION.md).

---

## Contract

| Rule | Detail |
|------|--------|
| Role source | `resolvePublicRegistrationRole()` → always `'client'` |
| Ignored client flags | `body.isAdmin`, `body.role` (any string) — logged when present, never used as a gate |
| Pending path | `pendingOnly` profiles also get `role: resolvePublicRegistrationRole(...)` |
| Account policy | Hidden / optional customer-login policy is **not** skipped because of a client `isAdmin` flag |
| Privileged roles | `tenant_admin`, `admin`, `staff`, `super_admin` — never returned by the helper |

### Correct admin bootstrap

| Surface | Authz | Role written |
|---------|-------|--------------|
| `POST /api/tenants/create-admin` | HMAC `registration_token` bound to `tenant_id` | `admin` |
| `pages/tenant-register.vue` | Calls create-admin after tenant insert | Admin via token |
| `POST /api/auth/register-client` | Public + rate limit | **`client` only** |

---

## Pitfalls

1. **UI still has `?role=admin` / `isAdminRegistration` copy** on `pages/register/[tenant].vue` — that is presentation only. The page **must not** send `isAdmin` to `register-client`; submitting that flow still creates a `client`. Real firm admin signup is `tenant-register` → `create-admin`.
2. **Do not reintroduce `isAdmin ? 'tenant_admin' : 'client'`** — service-role inserts make that a privilege-escalation hole. Production RLS on `users` does not constrain service-role.
3. **Root auth markdown can be stale** — prefer this runbook + the unit/source contracts in `public-registration-role.test.ts` over historical `AUTH_APIS_*` / `REGISTRATION_SECURITY_*` reports.
4. **Staff ≠ client** — invitation tokens and `role: 'staff'` live on `/api/staff/register`, not here.

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/public-registration-role.ts` | Fail-closed role resolver + privileged role list |
| `server/api/auth/register-client.post.ts` | Public registration; ignores client privilege flags |
| `server/api/tenants/create-admin.post.ts` | HMAC-gated first admin |
| `server/utils/registration-token.ts` | Token verify for create-admin / rollback |
| `pages/register/[tenant].vue` | Customer register UI (no `isAdmin` in fetch body) |
| `pages/tenant-register.vue` | Firm + admin bootstrap |
| `server/utils/__tests__/public-registration-role.test.ts` | Unit + source-contract guards |
