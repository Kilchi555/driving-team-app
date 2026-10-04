# Partial-Payment Remaining-Balance Invoicing

How staff invoice the **open remainder** of a Teilzahlung. Verified against source (Aug 2026).

## Intent

Customers can pay part of a lesson online/cash (`payment_status = partial`, `amount_paid_rappen` tracks cash/online collected **excluding** credit). Staff must be able to raise an invoice for **only what is still due**, without double-charging the already-paid amount.

## Surfaces

| Surface | Role |
|---------|------|
| Student Zahlungen tab | `EnhancedStudentModal` / `UserPaymentDetails` — «Rechnung erstellen» includes `partial` open items |
| Draft API | `POST /api/invoices/auto-draft` |
| Auto-complete path | `server/utils/auto-invoice-on-complete.ts` |
| PDF / resend / download | `invoice-pdf.ts` shows line «Bereits bezahlt» when `amount_paid_rappen > 0` |
| Load existing invoice | `POST /api/invoices/by-payment` enriches items with payment breakdown incl. `amount_paid_rappen` |

Auth: admin/staff session (`getAuthenticatedUser` + role check).

## Remaining-due formula

Per payment (rappen):

```
remaining = max(0, total_amount_rappen - credit_used_rappen - amount_paid_rappen)
```

UI (`calculateAppointmentAmount` in `UserPaymentDetails`) mirrors this for CHF display when status is `partial`.

`amount_paid_rappen` is **exclusive of Guthaben**. Credit is subtracted separately via `credit_used_rappen`.

## Draft inclusion rules (`auto-draft`)

Two load modes:

1. **Explicit** `payment_ids` — preview/draft from the selected Zahlungen rows (any method), scoped to `student_user_id`
2. **Fallback** — all uninvoiced rows with `payment_method = invoice` and status in `pending | open | partial`

Then always filter:

- Drop rows that already have `invoice_id`
- Keep only status `pending | open | partial`
- Keep only `remainingDueRappen(p) > 0`

Totals:

```
subtotal          = Σ gross (lesson + fees + products …)
totalAlreadyPaid  = Σ amount_paid_rappen
netAfterDiscounts = subtotal - discounts - credits - totalAlreadyPaid
vat / total       = from netAfterDiscounts (tenant VAT)
discount_amount_rappen (DB) = discounts + credits + totalAlreadyPaid
  → satisfies DB trigger: total ≈ subtotal − discount
```

Each draft line carries `amount_paid_rappen` so the PDF breakdown can list «Bereits bezahlt».

## Workflow

1. Record Teilzahlung on the appointment (cash/online) → payment stays `partial` with `amount_paid_rappen`.
2. In student Zahlungen, open **Rechnung erstellen**.
3. `auto-draft` builds a draft whose due amount is the **remainder** only.
4. Preview / send / mark paid as with normal invoice payments.
5. If an invoice already exists for the payment, use `by-payment` to view it (404 if no `invoice_id`).

## Pitfalls

- Do **not** invoice `total_amount` again for a `partial` row — always subtract `amount_paid_rappen` + `credit_used_rappen`.
- Payments that already have `invoice_id` are excluded from auto-draft (no duplicate invoice).
- Zero remaining (`remainingDueRappen == 0`) is filtered out even if status is still `partial`.
- PDF «Bereits bezahlt» appears only when line `amount_paid_rappen > 0`; older invoices without that field show no deduction line.
- Marking invoice paid / resend / download paths pass through the same enriched amounts — keep `amount_paid_rappen` on draft items when changing invoice utilities.

## Codepaths

- `server/api/invoices/auto-draft.post.ts`
- `server/utils/auto-invoice-on-complete.ts`
- `server/utils/invoice-pdf.ts`
- `server/api/invoices/by-payment.post.ts`
- `components/admin/UserPaymentDetails.vue` (`calculateAppointmentAmount`)
- `components/EnhancedStudentModal.vue`
- `components/InvoicePreviewModal.vue`
