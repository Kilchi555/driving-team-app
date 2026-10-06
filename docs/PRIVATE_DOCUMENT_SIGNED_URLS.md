# Private documents and signed URL access

**When to use:** Student/license docs open without login; DB rows still store `https://…/object/public/user-documents/…`; receipt links 404 after upload; accounting export cannot open Belege; migrating old public URLs; Capacitor PDF open after receipts became private.

Verified against source (Sep 2026). Commit `31c97850` (#158). Complements UUID path rules in draft `PUBLIC_PDF_STORAGE` (docs PR #72) — that draft’s “public URL” wording is outdated after this change.

---

## Intent

Buckets that hold PII or tenant accounting files must stay **private**. Persist only **storage object paths** in the database. Issue **time-limited signed URLs** (or app proxy redirects) at authorized read time.

#158 enforces:

1. Upload APIs return / store **paths**, not public object URLs.
2. `user-documents` reads go through authz + `createSignedUrl` (TTL **3600 s**).
3. Accounting / staff expense receipts go through path validation + `/api/accounting/receipt`.
4. Generated PDFs in `receipts` still use UUID-safe keys, but open via **signed** URLs (30-day TTL in `uploadPdfAndGetPublicUrl`).

---

## Contract

### User documents (`user-documents` bucket)

| Surface | Behavior |
|---------|----------|
| Persist | Object path only (e.g. `{userId}/…` or typed prefixes below) |
| Client open | `useUserDocuments().getPublicUrl(path, userId)` → `/api/documents/signed-url?path=…&redirect=1` |
| List API | `GET /api/documents/list-user-documents` may batch-sign paths |
| Authz | Owner **or** staff/admin/tenant_admin same tenant **or** `super_admin` (`canAccessUserDocument`) |
| Signed TTL | `USER_DOCUMENT_SIGNED_TTL_SECONDS` = **3600** |

Path helpers (`server/utils/user-document-url.ts`):

- Strip legacy public URLs: only `/object/public/user-documents/…` is accepted for rewrite; other http(s) → `null`.
- Owner inference supports prefixes: plain `{uuid}/…`, `medical-certificates/…/{uuid}/…`, `user-documents/…/{uuid}/…`, `customer-licenses/{uuid}/…`.
- Reject `..` and empty paths.

### Receipts / Belege

| Surface | Behavior |
|---------|----------|
| Persist | Path only — `assertPersistableReceiptRef` rejects http(s), `/object/sign/`, `/object/public/` |
| Display href | `receiptDisplayHref` → `/api/accounting/receipt?path=…&redirect=1` (or passthrough if already http for legacy) |
| Access API | `GET /api/accounting/receipt` — `requireAccountingAccess` + tenant path ownership |
| Buckets | Inferred by path shape: `receipts`, `tenant-documents`, or `user-documents` (`inferReceiptLocation`) |
| Ownership | Path must start with `{tenantId}/` or `accounting/{tenantId}/` |
| Signed TTL | `RECEIPT_SIGNED_TTL_SECONDS` = **3600** |

### Generated PDFs (`uploadPdfAndGetPublicUrl`)

- Bucket: `receipts`
- Key: `{folder}/{YYYY}/{MM}/{uuid}.pdf` (ASCII / UUID only)
- Returns a **signed** HTTPS URL (30 days), not `getPublicUrl`
- Helper name still says “Public” for call-site compatibility — do not reintroduce public ACL

---

## Pitfalls

1. **Saving a browser URL into `receipt_url` / document columns** — Writes fail with `Beleg darf nur als Storage-Pfad gespeichert werden` (or equivalent). Store the path returned by upload.
2. **Renaming `getPublicUrl` in the composable** — It is an app proxy to the signed-url API, not Supabase `getPublicUrl`. New UI should prefer that helper or `/api/documents/signed-url`.
3. **Legacy public URLs in DB** — `normalizeUserDocumentPath` / `extractReceiptStoragePath` can recover paths from known public/signed object URL shapes when reading; **do not** write those URLs back.
4. **Cross-tenant staff access** — Staff/admin need matching `tenant_id`; only `super_admin` bypasses tenant match. Wrong tenant → 403 `tenant mismatch`.
5. **Confusing with website media / logos** — Marketing buckets may still use public URLs. That is unrelated to student docs and accounting Belege.
6. **Draft PUBLIC_PDF_STORAGE** — Still correct on UUID keys and Capacitor needing https; incorrect if it claims the object is world-readable. Prefer this runbook for access control.

---

## Ops checks

```bash
# Authorized open (session cookie / Bearer as staff or owner)
curl -I -H "Authorization: Bearer $TOKEN" \
  "https://app.simy.ch/api/documents/signed-url?path=$(python -c 'import urllib.parse;print(urllib.parse.quote(\"USER_UUID/doc.pdf\"))')&redirect=1"

# Accounting receipt
curl -I -H "Authorization: Bearer $TOKEN" \
  "https://app.simy.ch/api/accounting/receipt?path=$(python -c 'import urllib.parse;print(urllib.parse.quote(\"TENANT_UUID/accounting/staff/…\"))')&redirect=1"
```

Unit coverage: `server/utils/__tests__/user-document-url.test.ts`, `receipt-storage.test.ts`, `user-documents-no-public-url.test.ts`, `upload-pdf-public.test.ts`, `access-control.test.ts`.

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/user-document-url.ts` | Path normalize, owner inference, signed URL create |
| `server/utils/access-control.ts` | `canAccessUserDocument` / `throwAccess` |
| `server/api/documents/signed-url.get.ts` | Authz gate + redirect or `{ url }` |
| `server/api/documents/list-user-documents.get.ts` | List + batch sign |
| `composables/useUserDocuments.ts` | Upload path persistence; `getPublicUrl` → signed-url API |
| `server/utils/receipt-storage.ts` | Persist/validate receipt paths; display href |
| `server/api/accounting/receipt.get.ts` | Tenant-scoped signed receipt redirect |
| `server/api/admin/accounting/entries*.ts`, `staff/submit-expense.post.ts` | `assertPersistableReceiptRef` on write |
| `server/utils/upload-pdf-public.ts` | Private `receipts` upload + long-lived signed URL |
| UI: `ProfileModal`, `EnhancedStudentModal`, `StaffExpenseSubmit`, admin accounting | Open via signed/proxy helpers |
