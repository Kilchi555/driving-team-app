# Staff POS / product sale as payment

Verified from `main` after merge of `e4d0ecef` (#336). Describes **current main** behavior only.

Open PR [#360](https://github.com/Kilchi555/driving-team-app/pull/360) proposes moving invoice / `invoice_send` / deferred credit to after payment completion. That is **not** main behavior below.

## Intent

Let staff sell catalog products to an existing client as a first-class `payments` row (no appointment), with server-authoritative prices and optional wallet credit for credit products — without writing `product_sales`.

The RPC comment states: *Does not write product_sales.*

## Architecture / flow

```
StaffPOSModal (pages/customers.vue)
  → POST /api/admin/staff-pos/sale
    → executeStaffProductSale (orchestrator)
      → supabase.rpc('staff_pos_sale', p_action: 'create' | …)
      → optional mail / Wallee only after RPC commit
```

Financial writes stay in `public.staff_pos_sale`. Mail and Wallee run only after that commit (`staff-product-sale-orchestrator.ts`).

### Methods (`STAFF_POS_METHODS`)

| UI key (`StaffPOSModal`) | Stored `payment_method` | Metadata `fulfillment` | `payment_status` on create |
|---|---|---|---|
| `cash` | `cash` | `cash` | `completed` |
| `deferred` | `deferred` | `deferred` | `pending` |
| `invoice` | `invoice` | `invoice` | `pending` |
| `invoice_send` | `invoice` (`storedPaymentMethod`) | `invoice_send` | `pending` |
| `online` | `wallee` (`parseStaffPosMethod('online')`) | `wallee` | `pending` |

Aliases: `parseStaffPosMethod` maps UI `'online'` → `'wallee'`.

### Sale create (`p_action: 'create'`)

1. Validate actor (`admin` / `staff` / `super_admin`), tenant-scoped client (`role = 'client'`, `deleted_at IS NULL`).
2. Load products `FOR SHARE`; reject vouchers, inactive, foreign tenant, non-positive `price_rappen`. Client money keys rejected (`assertNoClientMoney` / SQL `client_price_rejected`).
3. Advisory lock + insert `payments` with `metadata.source = 'staff_product_sale'`, `idempotency_key`, `fulfillment`, product snapshot, VAT snapshot (`vat_rate`, `gross_rappen`, `net_rappen`). `appointment_id` is `NULL`.
4. **cash**: also insert `cash_transactions` with `transaction_source = 'product_sale'`, `status = 'confirmed'`.
5. **invoice** / **invoice_send**: allocate invoice number, insert `invoices` (`status = 'pdf_created'`, `payment_status = 'pending'`, `sent_at = NULL`) + `invoice_items`, link `payments.invoice_id`.
6. **Credit on create** (when cart has credit products): only for `cash`, `deferred`, `invoice` — see below.

Does **not** replace `book_payment_to_accounting` or `calculate_invoice_vat`. Completed cash (and later completed online) still book via existing `payments_book_accounting` trigger; with no `course_registration_id` income category stays `"Termine"` (SQL header comment).

### Credit timing on current main

Helper: `creditsImmediately(method)` → `true` for `cash` | `deferred` | `invoice`; `false` for `invoice_send` | `wallee`.

| Method | When wallet credit is applied |
|---|---|
| `cash` | Inside `create`, same transaction as payment + cash row |
| `deferred` | Inside `create` (payment stays `pending`) |
| `invoice` | Inside `create` (invoice unsent; payment `pending`) |
| `invoice_send` | After successful send: orchestrator `claim_send` → mail → `apply_credit`. Requires invoice `sent_at`. On already-sent replay: `skip_send_apply_credit` path still calls `apply_credit`. |
| `wallee` | Not on create. Wallee webhook LAYER 10 when `paymentStatus === 'completed'`: `partitionWebhookPayments` → `applyStaffProductSaleCredits` → `staff_pos_sale(p_action: 'apply_credit')`. Guard: `webhookMayCredit` requires `metadata.source === 'staff_product_sale'` and resolved/status `'completed'`. |

`apply_credit` ledger type: `credit_transactions.transaction_type = 'credit_product_purchase'`, `reference_type = 'payment'`, `reference_id = payment_id`. Updates `student_credits.balance_rappen`.

Replay of `apply_credit`: if a `credit_product_purchase` row already exists for that payment → `{ credit_applied: true, replayed: true }`. Insert `unique_violation` also treated as replay.

## Public / staff interfaces

### API

| Route | Auth | Role |
|---|---|---|
| `POST /api/admin/staff-pos/sale` | `requireAdminProfile` | default `admin`, `staff`, `super_admin` |
| `GET /api/admin/staff-pos/customers?q=` | same | tenant clients only (`role=client`, `deleted_at` null, `is_active`) |

Product catalog for the modal: `GET /api/products/list-all` (filtered client-side: not voucher, active).

Body for sale (server rejects money fields): `customer_id`, `payment_method`, `idempotency_key` (UUID), `items: [{ product_id, quantity }]`.

### UI

- Entry: `pages/customers.vue` — **Shop** button (`currentUser.role !== 'client'`) opens `StaffPOSModal` (“Direktverkauf”).
- Display: `EnhancedStudentModal` / `GET /api/students/[id]/payments` use `staffProductSaleTitle` / `staffProductSaleRows` when `metadata.source === 'staff_product_sale'`.
- Receipt: `server/api/payments/receipt.post.ts` treats staff product sales via `staffProductLines`.
- Invoice auto-draft: `autoDraftAmountsFromPayments` / `staffPosAllocatedLines` fold POS VAT snapshots into drafts.

### Feature flags

- Tenant flag `product_sales_enabled` exists (nav `/admin/products`, customer shop card, plan features).
- **Staff POS modal path does not check `product_sales_enabled` in code**; gate is staff/admin session via `requireAdminProfile` + RPC role check.

### Legacy (not this subsystem)

- `components/ProductSaleModal.vue` + `POST /api/admin/product-sales/staff-pos.post.ts` still write `product_sales` / client-supplied prices. Tests assert that path is left in place. New Staff POS does not call it.

## Schema / migrations

All marked **DRAFT / do not apply** in SQL headers. Presence in the repo does not mean production applied them.

| File | Role |
|---|---|
| `migrations/20261001_bar_product_sale_schema_preflight.sql` | **DRAFT.** Replace `create_cash_transaction_from_payment` so `appointment_id IS NULL` skips auto cash; extend `cash_transactions_transaction_source_check` with `'product_sale'`; unique indexes `credit_transactions_credit_product_purchase_payment_uidx`, `payments_staff_product_sale_idempotency_uidx`. |
| `migrations/20261001_staff_pos_payment_rpc.sql` | **DRAFT.** `CREATE OR REPLACE FUNCTION public.staff_pos_sale(...)`; `GRANT EXECUTE` to `service_role` only (revokes PUBLIC / anon / authenticated). |
| `migrations/preflight/20261001_bar_product_sale_schema_checks.sql` | **NOT A MIGRATION.** Read-only post-apply checks. |

RPC actions: `create`, `apply_credit`, `claim_send`, `release_send`, `claim_wallee`, `release_wallee`, `attach_wallee`.

Tables touched by the RPC path: `payments`, `cash_transactions` (cash), `invoices` / `invoice_items` (invoice*), `student_credits`, `credit_transactions`, reads `products` / `users` / `tenants`.

Limits (TS + SQL): max 20 lines, qty 1–100, cart gross ≤ 5_000_000 rappen; send/Wallee claim TTL 2 minutes (`SEND_CLAIM_TTL_MS = 120_000` / SQL `interval '2 minutes'`).

## Constraints & pitfalls

1. **Idempotency**: same `(tenant_id, metadata.idempotency_key)` with `source = staff_product_sale` → unique index + advisory lock; create returns `replayed: true` without a second payment.
2. **Double-credit**: one `credit_product_purchase` per payment (`credit_transactions_credit_product_purchase_payment_uidx`). Immediate create credit for deferred/invoice means wallet is topped up while payment can still be `pending`.
3. **Tenant scoping**: actor tenant drives customer/product checks; foreign tenant → `foreign_tenant` / `invalid_customer` / `invalid_product`.
4. **Price authority**: client prices rejected. Catalog `products.price_rappen` and `credit_amount_rappen` are authoritative.
5. **Payment status**: only cash completes on create. Invoice/deferred/wallee/invoice_send stay `pending` until some other completion path.
6. **invoice_send**: credit blocked until `invoices.sent_at` (`invoice_not_sent`). Failed mail releases claim (`release_send`); `retry_same_key: true`.
7. **Wallee**: claim → `startStaffPosWallee` → `attach_wallee` with transaction id as `p_claim_token`. Webhook credits only after `completed`; failed staff credit returns **503** so Wallee retries (`staffCreditFailedIds`).
8. **Cash trigger**: preflight makes appointment-less payments skip `create_cash_transaction_from_payment`; Staff POS inserts its own confirmed `product_sale` cash row.
9. **VAT**: exact integer net must exist for tenant `default_vat_rate` (`no_exact_net` / `invoice_total_mismatch` if trigger total ≠ cart gross).
10. **Do not confuse** with `apply_credit_to_payment` (appointment wallet pay-down RPC in `migrations/20260915_apply_credit_to_payment.sql`). Staff product wallet **top-up** uses `staff_pos_sale(apply_credit)`.

## Codepaths

| Path | Role |
|---|---|
| `server/utils/staff-product-sale.ts` | Rules: methods, eligibility, money rejection, VAT net search, `creditsImmediately`, metadata, webhook partition/`webhookMayCredit` |
| `server/utils/staff-product-sale-orchestrator.ts` | `executeStaffProductSale`: RPC create + invoice_send / Wallee side effects |
| `server/utils/staff-product-sale-credit.ts` | `applyStaffProductSaleCredits` for webhook |
| `server/utils/staff-product-sale-wallee.ts` | `startStaffPosWallee` transaction + payment page URL |
| `server/utils/send-staff-pos-invoice.ts` | Email PDF for existing invoice; sets `sent_at` / `status = 'sent'` after send |
| `server/api/admin/staff-pos/sale.post.ts` | Staff sale HTTP entry |
| `server/api/admin/staff-pos/customers.get.ts` | Tenant client search |
| `server/api/wallee/webhook.post.ts` | LAYER 10 staff POS credit path |
| `server/api/invoices/auto-draft.post.ts` | POS VAT snapshot in auto-draft amounts/lines |
| `server/api/students/[id]/payments.get.ts` | Synthetic product rows from sale metadata |
| `server/api/payments/receipt.post.ts` | Receipt lines for staff product sales |
| `components/StaffPOSModal.vue` | Staff UI (Direktverkauf) |
| `pages/customers.vue` | Shop button + modal host |
| `components/EnhancedStudentModal.vue` | History title via `staffProductSaleTitle` |
| `utils/staff-product-sale-display.ts` | Client-safe titles/rows from metadata |
| `server/utils/__tests__/staff-product-sale.test.ts` | Matrix, orchestrator, webhook, migration guards |
| `migrations/20261001_bar_product_sale_schema_preflight.sql` | Schema/index DRAFT |
| `migrations/20261001_staff_pos_payment_rpc.sql` | `staff_pos_sale` DRAFT |
| `migrations/preflight/20261001_bar_product_sale_schema_checks.sql` | Read-only preflight checks |

No dedicated `composables/useStaffPos*` — modal talks to the APIs directly (`useCashPaymentSettings` only for cash visibility).
