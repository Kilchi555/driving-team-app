# Simy subscription payment receipt PDF

**When to use:** Tenant paid a Simy plan invoice but the confirmation email has no PDF; receipt lines show English Stripe copy or empty SMS $0 rows; duplicate payment emails after webhook retries.

Verified against source (Aug 2026). This is the **platform** (Simy → tenant) receipt, not tenant→student invoice PDFs.

---

## Intent

On successful Simy subscription charge, email the tenant a branded **QUITTUNG** PDF (issuer: Simy IT Systems Kilchenmann) plus an HTML summary. PDF failure must **not** block the email or subscription sync.

---

## Trigger & contract

| Item | Behavior |
|------|----------|
| Stripe events | Sync on both `invoice.paid` and `invoice.payment_succeeded` |
| Email + PDF | Only on **`invoice.paid`** when `amount_paid > 0` |
| Idempotency | `tenant_settings.setting_key = last_payment_email_invoice_id` stores Stripe `invoice.id`; retries skip resend |
| Recipient | `tenants.contact_email` (skip if missing) |
| Attachment name | `Quittung_{invoice.number \|\| invoice.id}.pdf` |
| Issuer branding | Hard-coded `SIMY_ISSUER` + logo from `https://simy.ch/simy-logo.png` (fallback `apps/simy/public/simy-logo.png`) |

PDF generation: `generateSimySubscriptionReceiptPdfSafe` → returns `null` on error (logged); email still sends without attachment.

### Line mapping

`receiptLinesFromStripe` / `localizeInvoiceLineDescription`:

- Translates common Stripe English phrases (unused/remaining time, seat, GBP add-on, metered SMS).
- **Drops** $0 lines whose description looks like SMS/metered (noise on Basil metered prices).
- Strips leading `N ×` quantity prefixes from Stripe descriptions.
- Amounts are Stripe **cents** treated as rappen in the shared invoice PDF renderer.

Customer block uses tenant legal/invoice address fields when present (`legal_company_name`, `invoice_street`, …).

---

## Pitfalls

1. **Looking at `payment_succeeded` alone** — Subscription upsert runs; confirmation email does not. Check `invoice.paid`.
2. **Webhook retries** — Second delivery should no-op once `last_payment_email_invoice_id` matches. If the first run crashed **after** email but **before** writing the setting, a duplicate is possible; prefer fixing the write order if that appears.
3. **PDF missing but email OK** — Non-fatal PDF path; check logs for `Simy subscription receipt PDF failed`. Logo fetch failure still attempts local file.
4. **Empty SMS rows** — Zero-amount metered lines are intentionally omitted from the PDF/HTML positions table.
5. **Not student receipts** — Driving-school lesson invoices use other download APIs + `uploadPdfAndGetPublicUrl`; do not debug those here.

---

## Ops checks

```sql
-- Last payment confirmation invoice id per tenant
SELECT tenant_id, setting_value AS last_invoice_id, updated_at
FROM public.tenant_settings
WHERE setting_key = 'last_payment_email_invoice_id'
ORDER BY updated_at DESC
LIMIT 20;
```

Reproduce locally: unit tests in `server/utils/__tests__/simy-subscription-receipt-pdf.test.ts` (line localization / $0 SMS drop).

---

## Codepaths

| Path | Role |
|------|------|
| `server/api/stripe/webhook.post.ts` | Event routing, `sendPaymentConfirmationEmail` |
| `server/utils/simy-subscription-receipt-pdf.ts` | Line map + QUITTUNG PDF |
| `server/utils/invoice-pdf.ts` | Shared PDF layout (`documentTitle: QUITTUNG`) |
| `server/utils/email.ts` | Attachment send |
