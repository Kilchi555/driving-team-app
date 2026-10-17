# Customer Account Deletion

**When to use:** Understanding or debugging in-app self-service account deletion (`POST /api/customer/delete-account`), including why deletion can be blocked for open receivables.

**UI entry points:** Customer profile → “Konto löschen” (`components/customer/ProfileModal.vue`); Simy marketing page `apps/simy/pages/konto-loeschen.vue`.

---

## Intent

Apple / Google require in-app account deletion when accounts can be created. The flow:

1. Anonymizes PII on the `users` row
2. Soft-deletes `user_documents`
3. Deletes the Supabase Auth user
4. Keeps legally retained financial / appointment records

Deletion is **blocked while money is still owed**, so receivables stay reachable for staff.

---

## Codepaths

| Layer | Path |
|-------|------|
| API | `server/api/customer/delete-account.post.ts` |
| Auth helper | `getAuthenticatedUser` |
| UI | `components/customer/ProfileModal.vue` |

---

## Request contract

```http
POST /api/customer/delete-account
Content-Type: application/json

{ "confirmation": "LÖSCHEN" }
```

- Requires an authenticated **client** session.
- Confirmation string must be exactly `LÖSCHEN` (case-sensitive).
- Staff / admin roles receive `403` — they cannot self-delete via this endpoint.

---

## Open-receivables gate (HTTP 409)

Before anonymization, the handler checks the caller’s tenant-scoped debts:

| Check | Source | Block condition |
|-------|--------|-----------------|
| Payments | `payments` | Status in `pending`, `partial`, `authorized`, `invoiced`, `invoice` **and** remaining balance `total > paid + credit_used` and `total > 0` |
| Invoices | `invoices` | Status in `draft`, `pdf_created`, `sent`, `overdue` **and** `total_amount_rappen > 0` |
| Credit debt | `student_credits` | `balance_rappen < 0` |

If any check fails to query (except a missing credit row), the API returns `500` rather than deleting.

Blocked response example:

```json
{
  "statusCode": 409,
  "statusMessage": "Dein Konto kann nicht gelöscht werden, solange offene Beträge bestehen (ca. CHF 42.50). ..."
}
```

**Support tip:** Settle or write off the open payments/invoices (or clear negative credit), then retry. Zero-amount leftover payments do not block.

---

## What is anonymized vs retained

**Anonymized / disabled on `users`:**

- Names → `Gelöscht` / empty
- Email → `deleted_<userId>@simy.local`
- Phone, birthdate, address, profession cleared
- `auth_user_id` → `null`, `is_active` → `false`

**Soft-deleted:** `user_documents` (`deleted_at`, `deleted_by`)

**Intentionally retained (Swiss bookkeeping / audit):**

- Payments, invoices, payment audit logs
- Completed appointments
- Audit logs (`action: account_self_deleted`)

---

## Common pitfalls

1. **Client sees “Konto kann nicht gelöscht werden”** → open receivables gate; check payments/invoices/credit for that `user_id` + `tenant_id`.
2. **Staff tries the UI** → `403`; only `role = client` is allowed.
3. **Wrong confirmation string** → `400` (must be exactly `LÖSCHEN`).
4. **Auth delete fails after anonymization** → `500`; PII may already be cleared — investigate Supabase Auth admin delete and restore carefully.

---

## Related docs

- Store checklists: `docs/APP_STORE_SUBMISSION.md`, `docs/ANDROID_PLAY_SUBMISSION.md`
