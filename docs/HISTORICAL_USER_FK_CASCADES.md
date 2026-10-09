# Historical user FK cascade protection

Verified from `main` after merge of `afd8ab54` (#379).

## Intent

Hard-deleting a `public.users` row must not silently destroy appointment history, audit events, or credit ledger rows. Live production had `ON DELETE CASCADE` on several historical FKs; this migration reconciles those constraints to safer semantics.

## What this is / is not

| In scope | Out of scope |
|---|---|
| Five FK constraint replacements (idempotent) | User deletion / anonymization product flows |
| Migration contract tests | Auth user wipe, soft-delete UX, RLS changes |
| | Production data mutation beyond DDL |

Repo presence of the SQL file is **not** proof it is applied in every environment. Confirm before relying on the new semantics in ops.

## Contract (after apply)

| FK | New `ON DELETE` | Why |
|---|---|---|
| `appointments.user_id` | `SET NULL` | Column already nullable; client appointment history (+ children) survives |
| `appointments.staff_id` | `RESTRICT` | Column `NOT NULL`; blocks hard delete until tombstone/anonymization exists |
| `audit_logs.user_id` | `SET NULL` | Audit survives actor removal (reconciles prior intent) |
| `student_credits.user_id` | `RESTRICT` | Credit wallet is financial history; keep tombstone attribution |
| `credit_transactions.user_id` | `RESTRICT` | Ledger lines keep attribution; no orphan-under-UNIQUE redesign |

Migration: `migrations/20261006_protect_historical_user_fk_cascades.sql` (transactional, `DROP IF EXISTS` + recreate).

## Constraints & pitfalls

1. Expect hard-delete of staff with appointments (or users with credit rows) to **fail** with FK violation after apply — that is the safety valve.
2. Do not “fix” by reintroducing `CASCADE` on these five FKs.
3. `SET NULL` on appointments/audit does not anonymize PII elsewhere; it only stops cascade destruction of the historical row.
4. Credit `RESTRICT` assumes a future tombstone/erasure model, not null wallets under `UNIQUE(user_id, tenant_id)`.
5. Complements invoice line name snapshots (#378): presentation can survive renames; FK hardenings protect history on delete.

## Codepaths

- `migrations/20261006_protect_historical_user_fk_cascades.sql`
- `server/utils/__tests__/protect-historical-user-fk-cascades.test.ts`
