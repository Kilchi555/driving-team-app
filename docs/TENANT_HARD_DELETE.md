# Superadmin tenant hard-delete

Verified from `main` after merge of `d4d78b92` (#385).

## Intent

Give **super_admin** a controlled, auditable way to permanently remove one tenant’s SIMY application data (preview → typed confirmation → transactional RPC → auth/storage cleanup → verify → optional email).

This is **not** soft-delete, not tenant deactivation, and not a self-serve customer action. It is irreversible for active DB rows; backups are not purged.

## Contract

| Surface | Behavior |
|---|---|
| Auth | `requireSuperAdmin` on both routes; execute also re-checks `users.role === 'super_admin'` |
| Target id | Route `:id` **must** be a tenant UUID (`isTenantUuid`). Never name/slug/email |
| Preview | `GET /api/admin/tenants/:id/hard-delete/preview` — read-only counts, warnings, storage/auth inventory, `confirmationPhrase` |
| Execute | `POST /api/admin/tenants/:id/hard-delete/execute` body `{ confirmation: "DELETE <exact tenant.name>" }` |
| Confirmation | Exact match to live `tenants.name` for that UUID (`expectedHardDeleteConfirmation`) |
| Destructive DB | **Only** `rpc('hard_delete_tenant_data', { p_tenant_id })`. No client-side delete fallback after RPC failure |
| Post-RPC | Auth user deletes (exclusive only) + storage removals (provably owned paths) outside the DB transaction |
| Success email | Sent **only** when final status is `COMPLETED` (not on `FAILED` / `PARTIAL_FAILURE`) |
| Audit | `logAudit` action `tenant_hard_delete`; job row in `tenant_hard_delete_jobs` |

UI: Danger zone on `pages/tenant-admin/tenants.vue` (Load preview → type phrase → Delete permanently).

### Status machine (`tenant_hard_delete_jobs.status`)

| Status | Meaning |
|---|---|
| `RUNNING` | Job created; RPC about to run / running |
| `FAILED` | RPC failed or tenant row still present after RPC — **no** auth/storage success path, **no** email |
| `VERIFYING` | RPC succeeded; verification in progress |
| `COMPLETED` | Verification ok, no blocking storage/auth issues; email may have been sent |
| `PARTIAL_FAILURE` | DB delete likely happened, but verification leftovers, storage failures, blocking auth skips, or email send failed |

### Inventory & verification (fail-closed)

- Live schema via `list_tenant_hard_delete_tables()` when available; otherwise static snapshot `TENANT_OWNED_TABLES` (preview warns).
- `countEq` **throws** on query errors — never treats errors as zero.
- Verification count failures become leftovers with `remaining: -1`, so status cannot become `COMPLETED` (and no success email).

### Storage ownership (only these)

1. Logo URLs on the tenant row (`tenant-logos` public/auth URL paths)
2. `tenant_assets` rows for this `tenant_id`
3. Storage list under `{tenant_id}/` prefix

**Never** delete by slug filename prefix.

### Auth cleanup

- Preview marks each Auth identity exclusive vs shared across tenants.
- After RPC, re-check remaining `users` refs; skip if other tenants still reference the Auth user.
- Exclusive (or zero remaining refs) → `auth.admin.deleteUser`.

### External systems

Stripe / Wallee / Resend / SARI identifiers may appear in preview warnings. SIMY **does not** call destructive external APIs. Cancel subscriptions / spaces externally if required.

### `website_prospects`

- Rows **owned** by the tenant (`tenant_id = target`) are deleted.
- Rows owned by another tenant but `matched_tenant_id = target` are **nulled**, not deleted.

### `reminder_templates`

RPC deletes only rows with `tenant_id = target`. Global templates (`tenant_id IS NULL`) stay.

## Architecture

```
UI tenants.vue (super_admin)
  → GET  …/hard-delete/preview
       requireSuperAdmin
       previewTenantHardDelete
         list_tenant_hard_delete_tables | static snapshot
         count tables / auth exclusivity / resolveStorageObjects
  → POST …/hard-delete/execute { confirmation }
       requireSuperAdmin + app super_admin profile
       preview + exact confirmation match
       insert tenant_hard_delete_jobs (RUNNING)
       rpc hard_delete_tenant_data          // ONLY DB destruction
       auth.admin.deleteUser (exclusive)
       storage.remove (owned paths)
       verifyTenantHardDelete
       update job COMPLETED | PARTIAL_FAILURE
       sendEmail only if COMPLETED
       logAudit tenant_hard_delete
```

RPC order (high level): clear NO ACTION/RESTRICT tenant children → no-FK / SET NULL owned rows → payment deps then `payments` → appointment NO ACTION nulls → `DELETE FROM tenants` (CASCADE remainder). See `migrations/20261007_tenant_hard_delete.sql`.

RPCs and `tenant_hard_delete_jobs` are `SECURITY DEFINER` / service_role-only (`EXECUTE` revoked from `PUBLIC`/`anon`/`authenticated`). App layer must authorize before calling.

## Constraints & pitfalls

1. **Migration may be undeployed.** File `migrations/20261007_tenant_hard_delete.sql` ships with #385; migration header says do not apply to production until re-review. Without the RPC, execute fail-closes (no JS fallback). Apply only after ops approval.
2. Never add a client-side “best effort” delete loop after RPC failure — that path was explicitly rejected in the security gate.
3. Do not target by slug/name in the API — UUID only; confirmation uses the **exact** live name (spacing/case matter).
4. Do not treat verification count errors as clean (`0`); leftovers with `remaining: -1` block `COMPLETED`.
5. Do not delete storage by slug prefix or Auth users that still have other-tenant `users` rows.
6. Hardcoded product code (e.g. Sara Lussi reply-email helpers) is **not** removed by this feature — preview may emit `hardcodedCodeHints`.
7. Impact gate: `.cursor/docs/gates/20261008-pr385-hard-delete-blockers.md` (CRITICAL; remediation scope only — no production delete in that gate).

## Codepaths

- `server/utils/tenant-hard-delete.ts` — preview, execute, verify, storage/auth
- `server/utils/tenant-hard-delete-inventory.ts` — UUID/confirmation helpers, table classifications, static snapshot
- `server/api/admin/tenants/[id]/hard-delete/preview.get.ts`
- `server/api/admin/tenants/[id]/hard-delete/execute.post.ts`
- `server/utils/require-super-admin.ts`
- `migrations/20261007_tenant_hard_delete.sql` — `tenant_hard_delete_jobs`, `list_tenant_hard_delete_tables`, `hard_delete_tenant_data`
- UI: `pages/tenant-admin/tenants.vue`
- Tests: `server/utils/__tests__/tenant-hard-delete.test.ts`, `tenant-hard-delete-api.test.ts`
