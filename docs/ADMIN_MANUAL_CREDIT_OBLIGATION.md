# Admin manual credit top-up + cancellation payment obligation

**When to use:** Operating or extending admin wallet top-ups, or toggling whether a cancelled appointment must still be paid (and the matching wallet repair).

Verified against current `main` (Oct 2026). Landed: **#324** (`ae1b2737`).

**Not this:** Wallee deposits / payment recovery (`docs/WALLEE_PAYMENT_RECOVERY.md`). Customer self-serve credit purchase. Open course-invoice work (#323). Staff POS product sale (draft #336).

---

## Intent

Give tenant admins two money-safe tools in `UserDetails`:

1. **Manual top-up** — credit a private customer’s wallet with a required note and UUID idempotency key so double-clicks do not double-credit.
2. **Cancellation obligation** — set `must_pay` on a **cancelled** appointment, preview the wallet delta, then apply a compare-and-swap charge change plus an idempotent ledger repair.

Both write paths are admin-authenticated and tenant-scoped. SQL RPCs are the concurrency authority.

---

## Contract (current `main`)

### Manual top-up — `POST /api/admin/credit/manual-topup`

| Item | Detail |
|------|--------|
| Auth | `requireAdminProfile` — `admin`, `tenant_admin`, `super_admin`, `superadmin` |
| Body | `user_id` (UUID), `amount_rappen` (int), `note` (3–500 chars trimmed), `idempotency_key` (UUID) |
| Amount | `1 … 1_000_000` rappen (max CHF 10 000.00) |
| Target | Same-tenant user with role `client` or `customer` only |
| Apply | RPC `apply_manual_credit_topup` — unique index on `(tenant_id, reference_id)` for `deposit` + `manual` + `manual_topup` |
| Replay | Same key → `already_applied` / `replayed: true`; **no** second insert or balance bump |
| Key clash | Same key, different user → RPC `idempotency_user_mismatch` → HTTP **409** |
| Audit | `logAudit` after success |

UI: `components/admin/UserDetails.vue` generates a fresh UUID per top-up attempt.

SQL file: `migrations/20260930_manual_topup_idempotency.sql` — header: **“Not applied by this change set.”** Confirm production apply before relying on the unique index / RPC.

### Cancellation obligation — `POST /api/admin/appointments/cancellation-obligation`

| Item | Detail |
|------|--------|
| Auth | Same admin roles as top-up |
| Body | `appointment_id` (UUID), `must_pay` (boolean), optional `dry_run`, `note` |
| Scope | Appointment must be `status = 'cancelled'` and `tenant_id = profile.tenant_id` |
| Plan | `planCancellationObligationChange` — wallet identity: `desiredWallet = collected * (100 - charge) / 100` |
| Collected | Settled payments minus Wallee refunds; open statuses count credit used; see `grossCollectedRappen` |
| Preview | `dry_run: true` or `noop` returns summary without writes |
| Note | Required (≥3, ≤500) when applying a non-noop change |
| Memory keys | Payment metadata: `obligation_prev_charge_percentage`, `obligation_credit_used_rappen`, `obligation_prev_payment_status` |
| Wallet repair | RPC `apply_cancellation_obligation_repair` with `obligation_repair_basis_id` = MD5 hash of eligible ledger UUIDs (sorted); empty snapshot → sentinel `00000000-0000-0000-0000-000000000000` |
| Types | `cancellation_charge_waiver` / `cancellation_charge_reinstate` |
| Stale basis | Concurrent change sees different ledger set → repair not applied / stale outcome (no double waiver) |

SQL file: `migrations/20260930_cancellation_obligation_repair_idempotency.sql` — marked **DRAFT** / do not apply until concurrency review accepted. Confirm before production ops.

---

## Pitfalls

1. **Migrations may be undeployed** — app code on `main` expects RPCs/indexes that the SQL files explicitly say were not applied by the PR. Missing RPC → 500 on apply.
2. **Idempotency key is per logical click** — regenerating the UUID on every retry creates a **new** top-up; reuse the same key to replay safely.
3. **Amounts are rappen integers** — never send CHF floats to `amount_rappen`.
4. **Only cancelled appointments** — obligation endpoint rejects other statuses with 400.
5. **`dry_run` first** — UI previews credit delta before commit; skipping preview risks surprising wallet moves.
6. **Wallee refunds reduce “collected”** — obligation math excludes money already returned via provider refunds.
7. **Do not conflate with cash `manual` deposits** — those keep `reference_type = 'manual'` / null `reference_id` and sit outside the top-up unique index.

---

## Codepaths

| Path | Role |
|------|------|
| `server/api/admin/credit/manual-topup.post.ts` | HTTP top-up |
| `server/utils/manual-credit-topup.ts` | Parse amount / note / key |
| `server/utils/apply-manual-credit-topup.ts` | RPC wrapper |
| `server/api/admin/appointments/cancellation-obligation.post.ts` | HTTP obligation toggle |
| `server/utils/cancellation-payment-obligation.ts` | Plan + basis hash |
| `server/utils/apply-cancellation-obligation-repair.ts` | Repair RPC wrapper |
| `server/utils/student-credit-ledger.ts` | Shared ledger helpers |
| `components/admin/UserDetails.vue` | Admin UI |
| `migrations/20260930_manual_topup_idempotency.sql` | Top-up RPC + index |
| `migrations/20260930_cancellation_obligation_repair_idempotency.sql` | Repair RPC + basis column |
| `server/utils/__tests__/manual-credit-topup.test.ts` | Parse tests |
| `server/utils/__tests__/cancellation-obligation-repair.test.ts` | Repair planning |
| `server/utils/__tests__/cancellation-payment-obligation.test.ts` | Obligation math |
