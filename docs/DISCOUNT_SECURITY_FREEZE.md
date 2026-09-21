# Discount security freeze (PR-A C1–C3)

**When to use:** Clients can inflate `usage_count` / `current_redemptions`; `/api/discounts/apply/:id` still mutates counters; customers apply pending appointment discounts; debugging abusive discount usage after #248.

Verified against source (Sep 2026). Merge `467e1c1a` (#248). Migration: `migrations/20260920_pra_discount_security_freeze.sql` (create-only; confirm production apply separately).

Related but separate:

- Fixed-value **units** (CHF vs rappen) — #246 / `server/utils/discount-amount.ts` (`discountKindForSource`, `computeDiscountAmountRappen`).
- SEC-C01 user privilege column freeze — `migrations/20260903_sec_c01_users_privilege_freeze.sql` (same JWT / `service_role` trigger pattern; different columns).
- Payments JWT / PostgREST write closure — #232.
- Wallee webhook fulfillment still increments counters with **service_role**.

This freeze does **not** add a usage ledger, reservation state, or new staff apply privilege.

---

## Intent

| ID | Problem | Freeze |
|----|---------|--------|
| **C1** | Client JWT / manage APIs could write `discounts.usage_count` or `voucher_codes.current_redemptions` | DB trigger + `REVOKE UPDATE` + payload stripping |
| **C2** | `POST /api/discounts/apply/:id` incremented usage from the client | Route returns **410 Gone**; callers removed |
| **C3** | Customers could call `POST /api/appointments/apply-discount` for pending applies | Customers **403**; staff/admin stay denied (unchanged model) |

Discount **validation** and **viewing** remain. Checkout still attaches codes via validate + payment/booking paths; counters move only through trusted server writers (today: Wallee webhook / other service-role fulfillment).

---

## Contract

### C1 — Protected counters

Helpers in `server/utils/protected-discount-counters.ts`:

- `PROTECTED_DISCOUNT_COUNTER_FIELDS` → `usage_count`
- `PROTECTED_VOUCHER_REDEMPTION_FIELDS` → `current_redemptions`
- `stripDiscountUsageCount` / `stripVoucherCurrentRedemptions`

Wired on manage APIs before service-role writes:

| Route | Strip / force |
|-------|----------------|
| `POST /api/discounts/manage` | Strips `usage_count`; create forces `usage_count: 0`; tenant from session |
| `POST /api/voucher-codes/manage` | Strips `current_redemptions` on update |
| `POST /api/vouchers/manage` | Create forces `usage_count: 0` (no client counter field) |

DB (`20260920_pra_discount_security_freeze.sql`), SEC-C01 pattern:

- Functions: `prevent_discounts_usage_count_client_mutation`, `prevent_voucher_codes_redemptions_client_mutation`
- Triggers: `trg_prevent_discounts_usage_count_client_mutation`, `trg_prevent_voucher_codes_redemptions_client_mutation`
- `SECURITY DEFINER` allows mutation only when JWT role is `service_role`, or SQL has **no** JWT context (migrations / console).
- Authenticated / anon / PUBLIC: INSERT forces counter to `0`; UPDATE that changes the counter raises SQLSTATE `42501`.
- `REVOKE UPDATE (usage_count)` on `discounts` and `REVOKE UPDATE (current_redemptions)` on `voucher_codes` from `PUBLIC`, `anon`, `authenticated`.

Client inserts that name `usage_count: 0` are OK: INSERT trigger still forces `0`; clients must not **update** the counter.

### C2 — Apply-by-id disabled

`server/api/discounts/apply/[discountId].post.ts` always throws **410** (`Gone — /api/discounts/apply/:id is disabled`) and must not touch the DB.

`composables/useDiscounts.ts` → `applyDiscount()` throws `Discount apply-by-id is disabled`. No app callers of `/api/discounts/apply/` remain.

### C3 — Pending appointment apply frozen

`server/api/appointments/apply-discount.post.ts`:

1. Require authenticated session (`401` if missing) via `getAuthenticatedUser`.
2. Load `users` role from DB by `auth_user_id` (never trust body `role` / `user_id` / `tenant_id` / `is_admin` / `is_staff`).
3. `client` / `customer` → **403** (`Forbidden`).
4. Staff/admin → **403** (`Nur Kunden können Rabattcodes anwenden`) — no new staff privilege.

`pages/customer/payments.vue` has no apply-discount callers; customers can still **see** discounts.

### Still allowed (not part of this freeze)

| Surface | Behavior |
|---------|----------|
| `POST /api/discounts/validate` | Read/validate codes; may **read** counters for limits |
| Shop client validate + cart attach | Does not hit C2/C3 routes |
| Booking / public payment discount resolve | Server-side price math (see #246 units) |
| `server/api/wallee/webhook.post.ts` | `getSupabaseAdmin()` increments `usage_count` / `current_redemptions` after paid fulfillment |

---

## Examples

**Malicious manage update (C1):** Staff `POST /api/discounts/manage` with `{ id, usage_count: 999, name: "X" }` → `usage_count` stripped; name may update. Direct PostgREST UPDATE of `usage_count` with user JWT → trigger / privilege error.

**Legacy apply-by-id (C2):** `POST /api/discounts/apply/<uuid>` → `410`, no counter write.

**Spoofed admin body (C3):** Authenticated customer posts `{ role: "admin", is_admin: true, discount_id: "..." }` → still `403`; handler never writes discounts/appointments.

---

## Pitfalls

1. **Re-enabling C2 “just for admin tools”** — any HTTP apply-by-id that writes counters recreates the vulnerability; prefer service-role fulfillment only.
2. **Trusting body role on apply-discount** — C3 ignores body privilege flags.
3. **Assuming revoke blocks INSERT** — only UPDATE is revoked; INSERT is gated by the trigger (forced `0`).
4. **Using `SECURITY DEFINER` + `current_user`** — wrong; follow SEC-C01 JWT / `service_role` / no-JWT checks in the freeze migration.
5. **Expecting a usage ledger** — PR-A deliberately does not introduce reservation/ledger tables; counter integrity is freeze + trusted writers only.
6. **Confusing with CHF units (#246)** — wrong charge amount ≠ counter tampering; fix units in `discount-amount.ts`, not by relaxing this freeze.
7. **Production SQL** — shipping app code without applying `20260920_pra_discount_security_freeze.sql` leaves DB-level C1 open even if manage stripping is deployed.

---

## Codepaths

| Area | Path |
|------|------|
| Counter strip helpers | `server/utils/protected-discount-counters.ts` |
| C1 migration | `migrations/20260920_pra_discount_security_freeze.sql` |
| C1 manage APIs | `server/api/discounts/manage.post.ts`, `server/api/voucher-codes/manage.post.ts`, `server/api/vouchers/manage.post.ts` |
| C2 route | `server/api/discounts/apply/[discountId].post.ts` |
| C2 client stub | `composables/useDiscounts.ts` (`applyDiscount`) |
| C3 route | `server/api/appointments/apply-discount.post.ts` |
| C3 UI | `pages/customer/payments.vue` (no apply-discount callers) |
| Trusted increment | `server/api/wallee/webhook.post.ts` (`getSupabaseAdmin`) |
| Tests | `server/utils/__tests__/pra-discount-security-freeze.test.ts`, `apply-discount.http.test.ts` |
