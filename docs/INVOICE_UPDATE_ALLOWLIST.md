# Invoice update allowlist (no payment fields)

**When to use:** `POST /api/invoices/update` returns 400 for `payment_status` / `paid_at` / ownership fields; debugging accidental “unpay” or billing edits that bundle payment keys; understanding which fields this generic update may write after #445.

Verified against `main` after `57543d57` (#445).

Related: house-number snapshots on create/select ([`INVOICE_BILLING_STREET_NUMBER`](https://github.com/Kilchi555/driving-team-app/pull/448) / #442) — address copy only. Settlement stays on dedicated paid/dunning paths (`mark-invoice-paid`, etc.), not this allowlist.

---

## Intent

Generic invoice update is for **send**, **cancel**, and **billing-address / notes** edits. Before #445, a mixed `updates` object could include payment or ownership keys and write them through the same endpoint. The allowlist rejects any forbidden key so **nothing** is written for that request.

---

## Contract

### Allowlist (`server/utils/invoice-update-allowlist.ts`)

| Allowed field | Notes |
|---------------|--------|
| `status` | Only `sent` or `cancelled` |
| `sent_at` | ISO timestamp string |
| `notes` | String or null; max 20 000 |
| `billing_company_name`, `billing_contact_person`, `billing_street`, `billing_street_number`, `billing_zip`, `billing_city`, `billing_email` | String or null; length limits in `STRING_LIMITS` |

`decideInvoiceUpdate(updates, updatedAt, storedBillingEmail?)` always adds `updated_at` on success.

### Reject-whole-request

Any key outside the allowlist → `{ ok: false, statusCode: 400, rejectedFields }` and **no** `payload`. Mixing an allowed house number with `payment_status` still rejects the entire body.

Typical rejected keys (non-exhaustive): `payment_status`, `paid_amount_rappen`, `paid_at`, `tenant_id`, `user_id`, `total_amount_rappen`, `subtotal_rappen`, `payment_method`, `credit_applied_rappen`, dunning fields.

### Callers (what they send today)

| Caller | Fields |
|--------|--------|
| `composables/useInvoices.ts` mark/send | `status`, `sent_at` |
| `composables/useInvoices.ts` cancel | `status`, `notes` |
| `InvoicePreviewModal` billing save | billing address fields; may send `billing_street_number` including `''` to clear; may resubmit current `billing_email` |

### Cancel side effect

After a successful cancel write, `server/api/invoices/update.post.ts` calls `releaseInvoicePayments`. Payment release is **not** an allowlisted field — it is server-side only when `payload.status === 'cancelled'`.

### Auth / tenant

Handler requires authenticated `admin` or `staff` with a `tenant_id`. Invoice must exist in that tenant (`403` cross-tenant, `404` missing).

### Billing email edge cases

- Exact `''` is rejected; callers clear with `null`.
- Placeholder / “keine e-mail” (via `isPlaceholderBillingEmail`) is accepted **only** when it exactly matches the already-stored email (preview resubmit). New malformed placeholders are rejected.

---

## Constraints & pitfalls

1. **Do not settle via update** — marking paid / adjusting `paid_*` belongs on dedicated routes (e.g. `POST /api/invoices/mark-invoice-paid`), not this allowlist.
2. **One forbidden key blocks all** — never “best-effort” strip payment fields client-side and assume a partial write; the server rejects the whole object.
3. **Status values** — only `sent` / `cancelled`. Other statuses (including `paid`) are not allowed here.
4. **Open settlement hardening PRs** — drafts that change mark-paid / atomic settlement (#417, #443, etc.) are orthogonal; do not fold into this runbook until they merge.
5. **Preview house number** — `billing_street_number` is allowlisted (including empty clear). Persistence of preview edits is a separate product path from payment rejection.

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/invoice-update-allowlist.ts` | `INVOICE_UPDATE_ALLOWED_FIELDS`, `decideInvoiceUpdate` |
| `server/api/invoices/update.post.ts` | Auth, tenant check, allowlist, cancel → `releaseInvoicePayments` |
| `composables/useInvoices.ts` | Send / cancel callers |
| `components/InvoicePreviewModal.vue` | Billing save payload |
| `server/utils/__tests__/invoice-update-allowlist.test.ts` | Allow / reject / email / house-number cases |
| `server/utils/__tests__/invoice-update.http.test.ts` | HTTP: no write on payment reject; cancel release |

---

## Quick verify

```bash
npx vitest run \
  server/utils/__tests__/invoice-update-allowlist.test.ts \
  server/utils/__tests__/invoice-update.http.test.ts
```
