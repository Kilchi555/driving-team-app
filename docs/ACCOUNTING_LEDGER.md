# Accounting ledger & accountant access

**When to use:** Treuhänder invite/login; journal lines missing or unbalanced; P&amp;L double-counts wages; contracts appearing as income; opening bank balance wrong; accountant can open billing pages.

Verified against source (Aug 2026).

---

## Intent

Tenant bookkeeping uses **double-entry journal lines** derived from `accounting_entries` (Schweizer KMU chart). External **accountants** get a restricted admin role (`accountant`) via `accountant_grants` (read or write), limited to accounting and payroll routes.

---

## Accountant access

| Piece | Detail |
|-------|--------|
| Table | `accountant_grants` — email, `access` (`read` \| `write`), `invite_token`, `user_id`, `revoked_at` |
| Invite | Admin `POST /api/admin/accounting/accountants` → email link |
| New user | `/register/accountant?token=…` → `POST /api/accountant/accept` creates auth + `users.role = accountant` |
| Existing accountant | Invite links to tenant login; grant may already set `user_id` |
| UI gate | `middleware/admin.ts` — accountants only `/admin/accounting*` and `/admin/payroll*` |
| Write | `accountantCanWrite(access)` — `write` required for mutations |

Conflict rules on invite: same-tenant user email → 409; non-accountant email elsewhere → 409 (need a dedicated Treuhänder address). Unique active grant per `(tenant_id, lower(email))`.

---

## Ledger model

| Table | Role |
|-------|------|
| `accounting_accounts` | Chart of accounts (seeded KMU defaults per tenant) |
| `accounting_categories` | Linked to an account when missing (`ensureTenantAccounts`) |
| `accounting_entries` | Header (income/expense, VAT, paid, storno, approval) |
| `accounting_journal_lines` | Soll/Haben lines; rebuilt by `syncEntryLedger` |

### Default system accounts (examples)

`1000` Kasse · `1020` Bank · `1100` Debitoren · `1170` Vorsteuer · `2000` Kreditoren · `2200` Geschuldete MWST · `2800` Eigenkapital · income `3000`/`3010`/`3200`/`3900` · expenses `5000`+ · `9000` Eröffnungsbilanz.

Category name → account map: `CATEGORY_TO_ACCOUNT` in `accounting-ledger.ts`.

### Line proposal (`proposeLedgerLines`)

- Skips **storno headers** (reversal copies original lines flipped) and non-P&amp;L entries
- **Expense:** PL (+ Vorsteuer) / Kreditoren or Bank|Kasse if settled
- **Income:** Debitoren or Bank|Kasse if settled / PL (+ MWST liability)
- Settled when `is_paid` or `linked_payment_id`; cash-like payment methods → `1000`, else `1020`
- Lines must balance or sync throws

### Sync rules (`syncEntryLedger`)

1. Ensure chart exists  
2. Delete existing lines for the entry  
3. Skip if soft-deleted, `approval_status` `rejected` \| `pending`, or `external_reference = opening-bank` (opening kept as-is)  
4. Insert balanced lines  

`backfillTenantLedger` rebuilds lines for historical entries.

---

## P&amp;L / receivables constraints

| Rule | Why |
|------|-----|
| `document_kind = contract` | Not a P&amp;L entry (`isAccountingPlEntry` false) |
| `external_reference = opening-bank` | Balance sheet only; no auto journal rewrite |
| Invoice quotes | `invoiceOutstandingRappen` is **0** for `document_kind = quote` |
| School profitability | Prefer ledger/company totals so wages are not double-counted (see payroll profitability APIs) |

Receipts: expenses/Spesen/Kreditoren generally require Beleg (`requiresAccountingReceipt`); Lohn and Kassendifferenz categories exempt.

---

## Pitfalls

1. **Accountant ≠ admin** — Role cannot open billing, users, or website; middleware redirects to accounting.
2. **Email already staff/admin** — Invite must use a separate address; cannot “promote” an existing school login.
3. **Pending approval = no lines** — Journal empty until approved; looks like “ledger broken”.
4. **Unbalanced propose** — Missing chart account number throws “Konto … fehlt” / “Soll und Haben stimmen nicht überein”.
5. **Cash vs bank** — Linked payment method string containing cash/bar/kasse posts to `1000`; everything else defaults to Bank `1020`.
6. **v1 AP clearing** — Settled Kreditoren go straight to Bank/Kasse (no two-step AP clear).

---

## Ops checks

```sql
-- Active accountant grants
SELECT id, email, access, user_id, accepted_at, revoked_at
FROM public.accountant_grants
WHERE tenant_id = '<tenant-uuid>'
ORDER BY invited_at DESC;

-- Unbalanced risk: entries with no lines (approved, not deleted)
SELECT e.id, e.type, e.amount_rappen, e.approval_status, e.document_kind
FROM public.accounting_entries e
LEFT JOIN public.accounting_journal_lines l ON l.entry_id = e.id
WHERE e.tenant_id = '<tenant-uuid>'
  AND e.deleted_at IS NULL
  AND e.approval_status IS DISTINCT FROM 'pending'
  AND e.approval_status IS DISTINCT FROM 'rejected'
  AND l.id IS NULL
LIMIT 50;
```

---

## Codepaths

- `server/utils/accountant.ts` — access helpers / allowed paths
- `server/utils/accounting-ledger.ts` / `accounting-ledger-db.ts` / `accounting.ts`
- `server/api/admin/accounting/accountants.post.ts` (+ get/patch)
- `server/api/accountant/accept.post.ts` / `invite.get.ts` / `active-tenant.post.ts`
- `middleware/admin.ts`, `pages/register/accountant.vue`, `pages/admin/accounting.vue`
- `sql_migrations/20260818_accountant_grants.sql`
- Related P&amp;L UX: `server/api/admin/payroll/profitability.get.ts`, `server/utils/accounting-budget.ts`
