# Invoice service-line name snapshot

Verified from `main` after merge of `776e1bc4` (#378).

Open ready PR [#292](https://github.com/Kilchi555/driving-team-app/pull/292) overlaps historically (event type / student snapshot). **Current `main` behavior and columns are defined by #378** — staff/customer first/last name freeze plus presentation helpers below. Rebase or close #292 against this contract before merging it.

## Intent

Service invoice lines freeze event-type and party presentation at creation. PDF, email, preview, download, resend, and by-payment must **not** re-read live appointments or live user rows to rename a stored line after staff/customers rename.

## Schema

Migration: `migrations/20261006_invoice_item_line_snapshot.sql`

Nullable columns on `invoice_items` (existing rows stay NULL; **no backfill**):

- `event_type_code`, `user_id`, `staff_id`
- `staff_first_name`, `customer_first_name`, `customer_last_name`

FKs on `user_id` / `staff_id`: `ON DELETE SET NULL`. Confirm production apply separately from repo presence.

## Contract

Helpers in `server/utils/invoice-line-snapshot.ts`:

| Helper | Role |
|---|---|
| `buildServiceLineSnapshot` | Immutable fields from **server** tenant-scoped appointment/party data only — never client-supplied snapshot values |
| `presentStoredInvoiceLine` | PDF/email/preview text from snapshot columns only |
| `formatStaffInvoiceLineTitle` | Line 1: event label + ` mit {staffFirstName}` (cancellation suffix preserved) |
| `formatCustomerInvoiceLine` | Line 2: `Kunde: {first} {last}` or omit |
| `hasServiceLineSnapshot` | True when service-line snapshot fields present; product lines (`productId`) skip |
| `loadTenantEventTypeNames` | Exact tenant `event_types` names by code — no fuzzy aliases |
| `resolveInvoiceLineLabel` | Event type name → non-generic title → `Leistung` |

Product / course lines do not use the staff-name title formatter.

## Constraints & pitfalls

1. Historical rows without snapshot columns keep `product_name` and omit customer line — do not invent names from live users.
2. Never accept snapshot names from the browser body.
3. Renaming a staff or customer user must not change already-issued invoice PDFs/emails for snapshotted lines.
4. Do not treat open #292 as the source of truth while #378 is on `main`.

## Codepaths

- `server/utils/invoice-line-snapshot.ts`
- `server/utils/invoice-pdf.ts`, `invoice-email.ts`, `invoice-persist-and-send.ts`, `auto-invoice-on-complete.ts`
- `server/api/invoices/create.post.ts`, `auto-draft.post.ts`, `by-payment.post.ts`, `download.post.ts`, `resend.post.ts`
- `components/InvoicePreviewModal.vue`, `components/admin/InvoiceDetailModal.vue`
- `types/invoice.ts`
- Tests: `invoice-line-snapshot.test.ts`, `invoice-line-snapshot-wiring.test.ts`
