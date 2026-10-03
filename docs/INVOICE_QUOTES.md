# Invoice quotes (Offerten)

**When to use:** Offerten appear in dunning/receivables; OF-/RE- numbers look wrong after accept; public `/o/:token` accept fails; staff convert works but customer link does not; quote texts stick after conversion.

Verified against source (Aug 2026).

---

## Intent

Quotes live in the **same `invoices` table** as invoices (`document_kind = 'quote'`). They stay out of receivables and dunning until accepted. Acceptance (public or staff) flips the row to `document_kind = 'invoice'`, allocates a **RE-** `invoice_number`, keeps **OF-** in `quote_number`, swaps template body texts when still at defaults, and optionally emails the new invoice PDF.

---

## Contract

| Field | Quote | After accept |
|-------|-------|----------------|
| `document_kind` | `quote` | `invoice` |
| Display number | `quote_number` (OF-YYYY-NNNN) | `invoice_number` (RE-…) |
| Both numbers at create | OF stored in **both** `quote_number` and `invoice_number` (NOT NULL + legacy trigger) | New RE in `invoice_number`; OF kept in `quote_number` |
| `valid_until` | Default invoice date + **30** days (`QUOTE_VALIDITY_DAYS`) | Unchanged; due date recalculated for invoice |
| `public_token` | UUID for `/o/{token}` | Remains on row |
| `accepted_at` / `declined_at` | Set on accept / decline | — |

Number allocation: RPC `allocate_quote_number(tenant_id)` (`tenants.next_quote_number`, prefix `quote_number_prefix` default `OF`).

---

## Lifecycle

`quoteLifecycle()` (Zurich calendar date):

`draft` → `sent` → `accepted` | `declined` | `expired` | `cancelled`

- **Accepted** if `accepted_at` set **or** row is already `invoice` with a `quote_number`
- **Expired** if `valid_until` &lt; today (Zurich) and not already terminal
- Draft UI statuses: `draft` or `pdf_created`

### Accept gates (`canAcceptQuote`)

| Caller | `allowDraft` | Extra |
|--------|--------------|--------|
| Public `POST /api/public/quotes/:token/accept` | **false** — must be `status === 'sent'` | Token lookup by `public_token` |
| Staff `POST /api/invoices/convert-quote` | **true** — draft OK | Roles `admin` \| `staff` \| `tenant_admin` |

Also blocked: already accepted, declined/cancelled, expired, or not a quote.

Public accept emails the converted invoice via `emailConvertedInvoice` (mail failure is logged; conversion still succeeds). Staff convert does **not** auto-email.

---

## Exclusions (quotes are not invoices)

| Path | Behavior |
|------|----------|
| `GET /api/invoices/get-summary` | `.neq('document_kind', 'quote')` |
| `GET /api/admin/dunning-overview` | `.eq('document_kind', 'invoice')` |
| CAMT match | invoice kind only |
| `invoiceOutstandingRappen` | returns **0** for quotes |
| Create + `apply_available_credit` | Credit apply runs **only** for non-quotes |

List API defaults to invoices; pass `document_kind=quote` for Offerten.

---

## Body text swap

On convert, if `notes` / `payment_terms` / `footer_text` still equal the **quote** tenant templates, they are replaced with **invoice** templates (`swapDocumentBodyTexts`). Customized fields are kept. Tenant columns: `quote_intro_text`, `quote_terms_text`, `quote_footer_text` (defaults in `invoice-quote.ts`).

Public page: `pages/o/[token].vue` + `GET/POST …/public/quotes/[token]`.

---

## Pitfalls

1. **Unsent public accept** — Customer link returns 422 until the Offerte is marked/sent (`status = sent`).
2. **Double number at create** — Seeing OF- in `invoice_number` on a quote is expected until conversion.
3. **Expiry is date-only Zurich** — `valid_until` compared as `YYYY-MM-DD` in Europe/Zurich, not UTC wall clock.
4. **Receivables bugs** — Any new summary/dunning query must filter `document_kind`; forgetting reintroduces Offerten into AR.
5. **Credit on quotes** — Creating a quote never auto-applies student credit; only real invoices do.
6. **Decline vs cancel** — Decline sets `declined_at`; cancel uses `status = cancelled`; both block accept.

---

## Ops checks

```sql
-- Open quotes
SELECT id, quote_number, invoice_number, status, valid_until, accepted_at, public_token
FROM public.invoices
WHERE tenant_id = '<tenant-uuid>'
  AND document_kind = 'quote'
ORDER BY created_at DESC;

-- Converted (kept OF number)
SELECT id, quote_number, invoice_number, document_kind, accepted_at, payment_status
FROM public.invoices
WHERE quote_number IS NOT NULL
  AND document_kind = 'invoice'
ORDER BY accepted_at DESC NULLS LAST
LIMIT 20;
```

---

## Codepaths

- `server/utils/invoice-quote.ts` — kind, lifecycle, accept gate, labels, text swap
- `server/utils/allocate-quote-number.ts` / `convert-quote-to-invoice.ts`
- `server/api/invoices/create.post.ts` / `convert-quote.post.ts` / `list.get.ts` / `get-summary.get.ts`
- `server/api/public/quotes/[token].get.ts` / `…/accept.post.ts` / `…/decline.post.ts`
- `sql_migrations/20260819_invoice_quotes.sql`, `20260819_quote_texts.sql`
- UI: `components/admin/InvoiceCreateModal.vue`, `InvoiceDetailModal.vue`, `pages/o/[token].vue`
