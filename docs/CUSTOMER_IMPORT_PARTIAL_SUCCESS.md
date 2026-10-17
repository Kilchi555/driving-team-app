# Customer import — keep valid rows when one fails

Verified from `main` after merge of `46042c56` (#343).

## Intent

Admin customer CSV/Excel import must not abort the whole file because one row is invalid or one insert batch partially fails. Valid rows still plan and write; failures are accounted per row.

## Contract

Planner: `planCustomerImport` in `server/utils/customer-import.ts` (pure — no Supabase).  
HTTP: `POST /api/admin/import-users` in `server/api/admin/import-users.post.ts` (tenant-scoped reads/writes).

### Accounting identity

Each input row is exactly one of: `created` | `updated` | `skipped` | `failed`.

- `created + updated + skipped + failed = total`
- `duplicates ⊆ skipped` (file-internal or existing unchanged)
- Dry-run `duplicates` **array** also lists planned updates for operator review — that list length is **not** the same as `duplicates` / `duplicateCount`

### File-internal duplicates

Rows process in file order. The first **valid** row owns its lowercased email and canonical phone. Later rows reusing either key are skipped as duplicates in every `duplicateMode` (including `create`). Invalid rows do **not** own keys — a later valid row can still win.

### Phone canonical form (storage = duplicate key)

Trim; strip spaces/hyphens/dots/parentheses/slashes; length &lt; 7 → null; Swiss national `07XXXXXXXX` → `+41…`. International `0041…` is **not** rewritten to `+41` (different keys).

### Batch execute

Inserts run in batches of `CUSTOMER_IMPORT_BATCH_SIZE` (500). `settleInsertBatch` maps DB outcomes back to planned rows so one bad insert does not discard an entire successful subset of the batch.

## Constraints & pitfalls

1. Do not assume all-or-nothing transaction across the whole file.
2. Formula-safety quote-prefix applies to free text starting with `=`, `+`, `-`, `@`, tab — **not** to email/phone (would break unique keys / E.164).
3. Prefer dry-run before overwrite/supplement modes; review the dry-run duplicates array separately from skip counts.
4. Separate from registration upload grants and from public course user linking (#308).

## Codepaths

- `server/utils/customer-import.ts`
- `server/api/admin/import-users.post.ts`
- `pages/admin/data-management.vue`
- Tests: `server/utils/__tests__/customer-import.test.ts`
