# NULL-tenant appointment children backfill & hard-delete harden

Verified from `main` after merge of `be8de802` (#393).

**When to use:** Hard-delete blocked by leftover `cash_transactions` / `discount_sales` with `tenant_id IS NULL` but `appointment_id` pointing at a live tenant appointment; ops preparing the P2 backfill; reviewing RPC adoption counts (`*_null_tenant_adopted`).

Companion to open draft [#391](https://github.com/Kilchi555/driving-team-app/pull/391) `TENANT_HARD_DELETE` (#385). This runbook covers the **#393** backfill + RPC adoption only — do not fold into #391 until that draft merges or rebases. ≠ historical user FK cascades (#379 / open #380).

---

## Intent

Legacy rows can have `tenant_id IS NULL` while still referencing an appointment that **does** belong to a tenant. Tenant-scoped RPC deletes miss those rows; `ON DELETE NO ACTION` FKs into `appointments` then block hard-delete.

#393 does two things (both human-gated for production apply):

1. **One-shot backfill** — set `tenant_id` from the appointment when ownership is unambiguous.
2. **RPC harden** — before appointment FK clears, adopt the same JOIN rule inside `hard_delete_tenant_data` so future leftovers cannot block CASCADE.

---

## Ownership rule (authoritative)

```
child.tenant_id := appointments.tenant_id
```

**Only when all of:**

- `child.tenant_id IS NULL`
- `child.appointment_id IS NOT NULL`
- appointment row exists
- `appointment.tenant_id IS NOT NULL` (backfill) / `appointment.tenant_id = p_tenant_id` (RPC)

**Never** infer ownership from `user_id`, `staff_id`, payment metadata, amounts, timestamps, or Wallee fields.

Tables in scope: `cash_transactions`, `discount_sales` only.

---

## Backfill migration

File: `migrations/20261009_backfill_null_tenant_appointment_children.sql`

| Step | Behavior |
|------|----------|
| Preflight | `RAISE EXCEPTION` if any NULL-tenant + `appointment_id` candidate lacks an unambiguous non-null `appointments.tenant_id` |
| Update | JOIN-only `SET tenant_id = a.tenant_id` for cash + discount |
| Postcondition | Fail if SAFE-pattern leftovers remain |
| Transaction | `BEGIN` … `COMMIT`; idempotent (re-run finds zero candidates) |

**Does not:** change FK `ON DELETE` behavior; globally `DELETE`/`UPDATE` where `tenant_id IS NULL` alone; auto-apply to production.

Discovery snapshot noted in the migration header (prod read-only, 2026-10-09): 31 cash + 35 discount = 66 SAFE rows. Live counts may differ; the JOIN rule remains authoritative.

Impact gate: `.cursor/docs/gates/20261009-null-tenant-appointment-children.md` (CRITICAL; no production apply in the gate).

---

## Hard-delete RPC adoption

File: `migrations/20261007_tenant_hard_delete.sql` (updated by #393)

Inside `hard_delete_tenant_data`, **before** tenant-scoped `appointment_id` nulling:

1. `UPDATE cash_transactions` / `discount_sales` — adopt `tenant_id` from appointments where `a.tenant_id = p_tenant_id` and child `tenant_id IS NULL`.
2. Count keys: `cash_transactions_null_tenant_adopted`, `discount_sales_null_tenant_adopted`.
3. Then existing clears: `SET appointment_id = NULL WHERE tenant_id = p_tenant_id` (and related appointment NO ACTION deps).
4. Finally `DELETE FROM tenants` (CASCADE remainder).

Never global NULL-tenant delete. Never touch other tenants’ appointments.

Without this adoption step, NULL-tenant children stay invisible to `WHERE tenant_id = p_tenant_id` clears and can block appointment delete.

---

## Constraints & pitfalls

1. **Migrations may be undeployed.** Both `20261009_…` and the updated `20261007_…` ship in git; headers / #393 say no production apply until ops approval. App hard-delete still fail-closes without the RPC (#385).
2. **Apply order:** prefer backfill first (clean data), then ensure the hardened RPC is live before executing hard-delete on tenants that may have legacy NULL children.
3. **Ambiguous candidates abort the backfill** — fix data or exclude manually; do not weaken the preflight to “best effort”.
4. **Do not** add heuristics (user/staff/amount) if new legacy patterns appear — extend only with an explicit JOIN ownership rule + gate.
5. **≠** soft-delete, tenant deactivation, or #379 user-delete FK protection.

---

## Smoke test

1. `npx vitest run server/utils/__tests__/null-tenant-appointment-children.test.ts` — SQL contract tests (string/shape assertions on both migration files).
2. On a non-prod copy (after ops approval): dry-run counts of SAFE candidates → apply backfill → confirm zero SAFE leftovers → hard-delete preview/execute for a disposable tenant and check RPC `*_null_tenant_adopted` counts if leftovers existed.
3. Confirm neither migration introduces `ON DELETE CASCADE` / `SET NULL` FK changes or `DELETE … WHERE tenant_id IS NULL`.

---

## Codepaths

| Path | Role |
|------|------|
| `migrations/20261009_backfill_null_tenant_appointment_children.sql` | Fail-closed JOIN backfill |
| `migrations/20261007_tenant_hard_delete.sql` | `hard_delete_tenant_data` NULL-tenant adoption + appointment clears |
| `server/utils/__tests__/null-tenant-appointment-children.test.ts` | Contract tests for both SQL files |
| `.cursor/docs/gates/20261009-null-tenant-appointment-children.md` | Implementation gate (CRITICAL) |

Related: open `TENANT_HARD_DELETE.md` (#391) for preview/execute/auth/storage; open `HISTORICAL_USER_FK_CASCADES` on #380 for user-delete FK protection (different problem).
