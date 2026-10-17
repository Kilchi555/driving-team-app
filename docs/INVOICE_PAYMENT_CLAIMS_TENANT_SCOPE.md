# Invoice payment claims and source stamps (tenant scope)

Verified from `main` after `#356` / `7143bbee`.

## Intent

When creating or linking invoices, payment claims and source-row stamps must use a **server-resolved tenant id**. Client-supplied tenant ids are never trusted for these writes.

## Architecture

Helpers live in `server/utils/invoice-tenant-guards.ts`:

```
loadClaimablePayments  → read tenant payments; reject missing / foreign / already linked
claimPaymentsForInvoice → conditional UPDATE (tenant + invoice_id IS NULL)
releasePaymentClaims   → restore prior status/method on rollback
deleteTenantInvoice    → delete invoice_items + invoice for that tenant only
stampInvoiceSourceRow  → stamp invoice_id on an allowlisted source table
```

Callers (e.g. `server/utils/invoice-persist-and-send.ts`, invoice create APIs, public course issuer) pass the tenant already resolved from auth or from the loaded registration/invoice row.

## Claim contract

`claimPaymentsForInvoice`:

- Updates only rows matching `id IN (…)`, `tenant_id = tenantId`, `invoice_id IS NULL`.
- Sets `invoice_id`, `payment_status = invoiced`, `payment_method = invoice`.
- Returns `{ expectedIds, claimedIds, complete }`. Incomplete claim → caller must release / delete; do not leave a half-linked invoice.

`loadClaimablePayments` throws `PaymentClaimRejectedError` if any requested id is missing, already has `invoice_id`, or is outside the tenant.

## Source stamp contract

`stampInvoiceSourceRow` allowlist (`INVOICE_SOURCE_TABLES`):

- `course_registrations`
- `room_bookings`
- `vehicle_bookings`

Update only when `id`, `tenant_id` match and `invoice_id IS NULL`. Unsupported table → `{ stamped: false, error }`.

## Constraints & pitfalls

1. Never pass a body `tenant_id` into these helpers — resolve from session or from a row already loaded with server tenant checks.
2. Incomplete claims must roll back via `releasePaymentClaims` + `deleteTenantInvoice` (see persist-and-send flow).
3. Public course billing reuses `stampInvoiceSourceRow` for registrations; payment uniqueness for that path is a separate partial unique index (`payments_public_course_invoice_registration_uidx`) — see `COURSE_INVOICE_PUBLIC_ISSUANCE`.
4. Distinct from Staff POS credit timing and cash ledger attribution.

## Tests

- `server/utils/__tests__/invoice-tenant-isolation.test.ts`
