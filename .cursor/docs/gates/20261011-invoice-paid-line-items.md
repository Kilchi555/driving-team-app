# IMPLEMENTATION GATE — Invoice creation: paid line items + correct payment posting

**Date:** 2026-10-11  
**Change risk:** CRITICAL (payments, invoice settlement, cash ledger adjacency, multi-tenant isolation)  
**Baseline:** `origin/main` / Production `da9a50f062609e7d45bf8f8e79ae2edf99587f8e`  
**Approval status:** User requested full implementation. Impact Analysis still requires explicit choice on the architectural decisions below before application code may change. Implementing Executor must **not** self-approve those decisions.

---

```
IMPLEMENTATION GATE

Change:
Extend InvoiceCreateModal so staff/admin can mark individual invoice line items
as already paid at creation time; persist real settlements through the existing
invoice payment architecture; show paid/unpaid lines and outstanding amount on
invoice PDF/email; prevent duplicates, false cash, false Wallee settlement, and
cross-tenant writes.

CHANGE CLASS:
* UI
* Component
* API
* Database (likely additive — decision pending)
* Payment
* Authorization (privilege boundary — decision pending)
* Multi-tenant isolation

In Scope:
* InvoiceCreateModal per-line paid controls + live totals
* Server create path recording invoice_payments + invoice paid_amount/status
* Document (PDF/email/preview) paid vs open presentation + outstanding
* Idempotency / duplicate-submission guards for create+settle
* Targeted Vitest for settlement math, authz, duplicates, provider safety
* Additive schema only if required for document snapshot (not applied to prod)

Out of Scope:
* Production migration apply / deploy / merge
* New independent payment subsystem
* Mutating historical invoices/payments/ledger rows
* Falsely completing Wallee/online provider transactions
* Redesign of appointment-level bulk cash / POS / credit flows
* Backfill of historical invoice_items
* Changing Stripe SaaS billing

Hotspots:
* P0: Multi-tenant isolation (invoice/payment writes via admin client)
* P0: Tenant payments / Wallee adjacency (must not forge provider settlement)
* P2: Cash / credits (cash ledger trigger on payments, not invoice_payments)
* Dependency of invoices / dunning / mark-invoice-paid

Blast Radius: Large (invoice create, settlement ledger, PDF/QR amounts, dunning outstanding, linked payments)

Change Risk: CRITICAL

Decision Required:
User or separately authorized Architect approval required — see DECISIONS below.
Implementing Executor may not self-approve.

Direct Impact:
* components/admin/InvoiceCreateModal.vue
* server/api/invoices/create.post.ts
* server/api/invoices/mark-invoice-paid.post.ts (shared settlement helper extract)
* server/utils/invoice-pdf.ts (+ download/resend/email wiring)
* components/InvoicePreviewModal.vue
* types/invoice.ts
* Possible additive migration on invoice_items / invoice_payments / idempotency

Indirect Impact:
* Invoice dunning outstanding (total - paid_amount)
* Linked payments.invoice_id / payment_status when open items claimed
* QR amount on PDF (today uses full total, not outstanding)
* Admin invoice list partial-paid display
* Cash ledger ONLY if we complete linked cash payments rows

Potential Impact:
* Staff privilege expansion if create allows settlement while mark-invoice-paid is admin-only
* Double booking if create stamps payments as invoiced AND also settles them incorrectly
* Reminder/dunning suppression for correctly settled balances (desired) vs incorrect paid_amount

Out-of-scope findings (REPORT ONLY):
1. mark-invoice-paid inserts invoice_payments but does not create cash_transactions.
   Cash ledger is driven by payments cash+completed (+ appointment_id) or staff POS RPCs.
2. PDF QR amount uses invoice.total_amount_rappen, not outstanding after paid_amount_rappen.
3. create.post.ts is multi-step without a DB transaction (pre-existing atomicity gap).
4. No invoice_item_id on invoice_payments — no true line-item allocation table today.

Dependency Evidence:
* Invoice create UI: components/admin/InvoiceCreateModal.vue → POST /api/invoices/create
* Authoritative invoice settlement: server/api/invoices/mark-invoice-paid.post.ts
  → updates invoices.paid_amount_rappen/payment_status + inserts invoice_payments
* Outstanding: total_amount_rappen - paid_amount_rappen (invoice-dunning-send.ts)
* Line “Bereits bezahlt” on PDF: invoice-pdf.ts amount_paid_rappen (today joined from
  payments by appointment_id at download time — not stored on invoice_items)
* Offline completable methods (staff create-payment): cash, twint, bank_transfer, card_terminal
* Bank import dedupe: bank_import_records(tenant_id, dedupe_key) unique
* Wallee: webhook_logs + RPC locks; staff must not set completed for wallee/online
* Cash trigger: create_cash_transaction_from_payment() on payments; skips NULL appointment_id

Security Impact: Critical
Database Impact: Medium–High (additive schema likely)
Multi-Tenant Impact: Critical (admin client + tenant filters)
Regression Risk: Critical
Breaking Change: Yes (create API contract + invoice document amounts if outstanding shown)

TEST LEVEL: L0 + L1 + L2-style unit + L4 tenant isolation (manual/automation gap for full E2E payment)

Required Tests:
* Vitest: settlement helper (totals, clamp, partial/full status, method whitelist)
* Vitest: no Wallee/online completion from paid-line payload
* Vitest: tenant isolation rejects cross-tenant refs
* Vitest: duplicate idempotency key does not double-insert invoice_payments
* Vitest: PDF/summary data — paid lines labeled, outstanding = total - settled
* Vitest: cash ledger NOT invented for bank_transfer/twint; cash only via existing payment path if Decision B chooses that
* Regression: existing create without paid lines; mark-invoice-paid; invoice-tenant-isolation; cash-ledger-attribution; wallee-webhook-replay
* Manual: InvoiceCreateModal paid/open mix, PDF preview, admin list partial status
* Gap: no formal HTTP create+pay integration suite — NEEDS VERIFICATION / add targeted tests

Manual Verification:
* Admin create invoice: 0 paid / mixed / all paid
* Staff path per Decision A
* PDF shows all lines + Bereits bezahlt / Noch offen + correct outstanding
* Dunning ignores fully settled; still targets remaining open
* No emails/SMS/Wallee calls in tests

Security Verification:
* NEEDS VERIFICATION until implemented: cross-tenant invoice/item/payment IDs rejected
* Client-supplied tenant_id / amounts / paid flags must not bypass server validation
* Provider methods cannot be marked completed from UI alone

Database Verification:
* NEEDS VERIFICATION: additive migration vs production schema before any human apply
* Do not apply migration in this agent run

Recommendation:
BLOCK IMPLEMENTATION — NEEDS VERIFICATION / ARCHITECTURAL DECISION REQUIRED
(see DECISIONS; safe reusable design is documented below for approval)
```

---

## ARCHITECTURE DISCOVERY (evidence)

### Canonical records
| Concept | Table / mechanism |
|--------|-------------------|
| Invoice | `invoices` |
| Line item | `invoice_items` (snapshot fields; optional `payment_id` / `appointment_id`) |
| Invoice settlement event | `invoice_payments` (invoice-scoped; **no** `invoice_item_id`) |
| Operational payment | `payments` (appointment/course/POS; `invoice_id` claim) |
| Cash ledger | `cash_transactions` via `create_cash_transaction_from_payment` on **payments** |

### Authoritative outstanding (invoices)
`max(0, total_amount_rappen - paid_amount_rappen)` — used by dunning.

### Authoritative settlement write path today
`POST /api/invoices/mark-invoice-paid` (roles: **admin, tenant_admin** only):
1. Optional `bank_import_records` dedupe
2. Clamp cumulative `paid_amount_rappen`
3. Set `payment_status` partial|paid and invoice `status`
4. Insert `invoice_payments` row
5. If fully paid: complete linked `payments`, staff-POS credits, wallet credit

### Invoice create today
`POST /api/invoices/create` (roles: **admin, staff**):
- Allocates number, inserts invoice + items, claims open payments as `invoiced`
- Does **not** write `invoice_payments` or `paid_amount_rappen`
- Always starts `payment_status: 'pending'`

### Document “Bereits bezahlt”
PDF already renders per-line `amount_paid_rappen` as “Bereits bezahlt”. Download joins that from linked **payments** by appointment — free-form / product lines have no persisted per-line paid snapshot.

### Cash vs invoice settlement
Marking an invoice paid (including method `cash`) does **not** insert `cash_transactions`. Cash ledger requires a completed cash **payment** row (usually with `appointment_id`), or staff POS RPC paths.

---

## DESIGN (proposed — pending approval)

### UI
- Per line in InvoiceCreateModal: payment state Open | Already paid
- When paid: require method ∈ `{cash, twint, bank_transfer, card_terminal}` + payment date; optional reference; amount = full line total (no accidental partial-line unless Decision C expands)
- Live footer: Total / Bereits bezahlt / Noch offen (integer rappen)
- Quotes: paid controls disabled

### Persistence semantics
1. Create invoice + items as today (server recomputes totals)
2. For paid lines: insert one or more `invoice_payments` (group by method+date+reference or one per line — Decision D)
3. Set `invoices.paid_amount_rappen` / `payment_status` / `paid_at` via shared helper extracted from mark-invoice-paid
4. Document snapshot: additive nullable columns on `invoice_items` e.g. `settled_amount_rappen`, `settled_payment_method`, `settled_at` — **display only**, never authoritative vs `invoice_payments`
5. Linked open `payments`: if a paid line settles a previously unpaid open item, do **not** leave it `invoiced` while invoice shows paid — complete or partially update consistently with Decision E
6. Never accept `wallee` / `online` / unverified card as completed settlement
7. Idempotency: require client `idempotency_key`; store unique `(tenant_id, idempotency_key)` for create+settle (new table or column) — return existing invoice on retry

### Cash ledger
Default recommendation aligned with existing invoice settlement: **do not** invent `cash_transactions` from invoice_payments alone. If a line is tied to an appointment payment and method is cash, optionally complete that payment through the existing payment completion path so the trigger fires once (Decision B).

### Atomicity
Pre-existing gap: no single DB transaction for create. Recommended: extract settlement helper; on settlement failure after invoice insert, either compensating delete of the new invoice (same tenant, unsent) or fail closed before claiming payments. Prefer a Postgres RPC later (out of minimum scope unless Decision F requires it).

---

## DECISIONS BLOCKING IMPLEMENTATION

### Decision A — Who may record prepaid settlement at create?
- **Today:** create = admin|staff; mark-invoice-paid = admin|tenant_admin only.
- **Options:**
  1. Only admin|tenant_admin may submit paid lines (staff create unpaid only)
  2. Staff may settle with offline methods only (expands invoice settlement privilege)
- **Why blocking:** Authorization / privilege gate (CRITICAL).

### Decision B — Cash ledger when line marked cash?
- **Today:** invoice mark-paid does not write cash ledger.
- **Options:**
  1. Match mark-invoice-paid: invoice_payments only; no cash_transactions from create
  2. For appointment-linked lines: complete linked cash `payments` so existing trigger posts ledger once
  3. Always insert cash_transactions for cash method (new semantics; high risk)
- **Why blocking:** Financial integrity / false or missing cash receipt.

### Decision C — Partial settlement of a single line?
- **Today:** invoice-level partial yes; line-level allocation no.
- **Options:**
  1. Line fully paid or open only (amount = line total)
  2. Allow amount_received < line total (invoice-level allocation only; UI shows “teilweise”)
- **Why blocking:** Avoid accidental partial-line model.

### Decision D — One invoice_payments row per line vs grouped by method/date?
- Affects audit granularity and retry uniqueness.
- **Recommendation:** one row per paid line with notes referencing item sort_order/id after insert, unless product prefers grouped receipts.

### Decision E — Linked `payments` rows when open item marked paid at create?
- If create currently stamps `invoiced` then settlement must not leave operational payment open incorrectly.
- **Options:** complete linked payment when line fully settled; leave invoiced until full invoice paid (current mark-invoice-paid behavior for partials).

### Decision F — Require DB RPC for atomic create+settle?
- **Recommendation for v1:** shared TS helper + compensating rollback; document non-atomic limitation; RPC as follow-up if required for Ready-to-Ship CRITICAL floor.

---

## SAFETY (this run)
* Production writes: NONE
* Real payment transactions: NONE
* Customer notifications: NONE
* Production migrations: NOT APPLIED
* Production deployment: NOT PERFORMED
* Application code modifications: NONE (gate only)
