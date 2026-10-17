# Voucher manage access (F-04)

**When to use:** Debugging 403 on `/api/vouchers/manage`; reviewing voucher create/load IDOR; distinguishing staff mint vs paid issuance.

Verified against source (Sep 2026). Commit `133ab51b` (#144). Detail audit: `audits/2026-09-03-f04-remediation.md`.

---

## Intent

`POST /api/vouchers/manage` uses the service-role client. Before F-04, callers could pass arbitrary `userId` / `tenant_id` and mint or list discounts across tenants. The fix: **session first**, force `tenant_id` from the session, and scope every ownership check to that tenant. Customers must not mint unpaid discounts through this endpoint.

---

## Auth and roles

| Requirement | Rule |
|-------------|------|
| Session | `getAuthenticatedUserWithDbId` — missing user/tenant → **401** |
| Tenant | Always session `tenant_id` (never body `tenant_id`) |
| Staff roles | `admin`, `staff`, `super_admin`, `tenant_admin` |

---

## Actions

| Action | Who | Ownership / scope |
|--------|-----|-------------------|
| `load` | Any authenticated | Default: own vouchers. Other `userId` only if staff **and** target `users.tenant_id` matches session tenant |
| `find-by-code` | Any authenticated | Code lookup **and** `tenant_id = session tenant` |
| `create` | **Staff only** | Owner defaults to session user; other `voucherData.user_id` must belong to same tenant. Insert always stamps session `tenant_id` |
| `redeem` | Owner or staff | Load by id **and** session tenant; non-staff cannot redeem another user’s voucher |

Unknown `action` → **400**.

### Create field allowlist

Only keys in `CREATE_ALLOWLIST` are copied from `voucherData` (name, code, discount fields, recipient/buyer metadata, `payment_id`, `applies_to`, `valid_until`, `description`, …). Privileged columns like raw `tenant_id` are not taken from the client.

Generated code alphabet: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, length 10 (if client omits `code`).

---

## Paid issuance (out of band)

Paid gift-card / voucher issuance after purchase stays on **`/api/vouchers/create-after-purchase`** (internal secret). Do not weaken `manage` `create` to let customers self-mint unpaid balances.

---

## Pitfalls

- Service role bypasses RLS — **every** query must filter `tenant_id` (and ownership) in application code.
- Staff `load`/`create` for another user without verifying `users.tenant_id` → IDOR; always re-check.
- Customer `create` → **403** by design.
- Redeem without tenant filter would cross tenants; both select and update use `.eq('tenant_id', tenantId)`.

---

## Codepaths

| Path | Role |
|------|------|
| `server/api/vouchers/manage.post.ts` | Manage actions + F-04 gates |
| `server/utils/auth.ts` | `getAuthenticatedUserWithDbId` |
| `server/utils/__tests__/f04-vouchers-manage-remediation.test.ts` | Unit coverage |
| `audits/2026-09-03-f04-remediation.md` | Full remediation report |
