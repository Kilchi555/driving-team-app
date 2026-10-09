# Course invoice phase 1 (schema only)

**When to use:** Understanding what #313 landed in Postgres before any issuer UI/API; timing columns on tenants/categories; registration price snapshots; `course_invoice_bindings`; when `issue_course_invoice` is safe to call; why nothing auto-invoices yet.

Verified against current `main` (Sep 2026). Landed: **#313** (`cdec5288`).

**Not this:** Appointment `booking_policy` / auto-invoice-on-complete, Wallee course enrollment checkout, company multiline invoice addresses, or any Nitro route that creates course invoices — **none of those call this schema yet**.

---

## Intent

Phase 1 adds **schema and SQL guards only**:

- Tenant + course-category **timing defaults** for a future auto-invoice scheduler
- Nullable **price snapshot** columns on `course_registrations`
- Binding table so one registration maps to at most one course invoice
- Hardened `course_registrations_protect_payment_fields` (freeze `invoice_id` once set; clear snapshot fields for non-service writers)
- Service-role RPC `issue_course_invoice` that can issue **one draft** invoice from an existing snapshot, or return an already-linked invoice

Applying the migration does **not** insert invoices, backfill snapshots, schedule jobs, send email, or change existing prices/statuses. Until a later phase writes snapshots and calls the RPC from app code, product behavior for course billing stays as before (timing default `off` → nothing invoices).

---

## Contract (current `main`)

### Timing columns

| Surface | Column | Default | Allowed values |
|---------|--------|---------|----------------|
| `tenants` | `default_invoice_timing_mode` | `off` | `off`, `immediate`, `days_before_start`, `on_confirmed` (**no** `inherit`) |
| `tenants` | `default_invoice_lead_days` | `NULL` | `0..365`; **required** when mode is `days_before_start` |
| `course_categories` | `invoice_timing_mode` | `inherit` | `inherit`, `off`, `immediate`, `days_before_start`, `on_confirmed` |
| `course_categories` | `invoice_lead_days` | `NULL` | Same range/required rules as tenant |

Semantics (from SQL comments / checks):

- Tenant `off` → default is “do not auto-invoice”
- Category `inherit` → use tenant default (including existing rows after add-column)
- Category `off` → **never** auto-invoice for that category, even if tenant is `immediate`
- These are **not** appointment `booking_policy` switches

No app code on `main` reads or writes these columns yet (verified: only the static schema test references them).

### Registration price snapshot

Nullable columns on `course_registrations` (no defaults, no backfill):

`agreed_net_rappen`, `agreed_vat_rate`, `agreed_vat_rappen`, `agreed_gross_rappen`, `discount_rappen`, `voucher_rappen`, `credit_applied_rappen`, `agreed_payment_method`, `price_snapshot_at`

When the non-null snapshot fields are present, check constraint requires:

```text
vat = round(net * rate / 100)
gross = net + vat - discount - voucher
gross >= 0
```

**Credit is not part of gross.** `price_snapshot_at` stays `NULL` until a later phase writes a real snapshot.

### Binding table

`course_invoice_bindings (tenant_id, registration_id, invoice_id)`:

- Unique `(tenant_id, registration_id)` — one binding per registration
- Tenant guard trigger: registration + invoice must share `tenant_id`
- RLS enabled; **no** grants to `anon` / `authenticated`; `service_role` gets SELECT/INSERT/UPDATE (**no DELETE grant**)
- Separate from non-unique `course_registrations.invoice_id` (company invoices may still point at many registrations historically)

### `issue_course_invoice(p_tenant_id, p_registration_ids, p_actor_user_id)`

| Rule | Detail |
|------|--------|
| Privilege | `service_role` only (`REVOKE` from `PUBLIC` / `anon` / `authenticated`) |
| Cardinality | Exactly **one** registration id |
| Already billed | If `course_registrations.invoice_id`, matching `payments.invoice_id`, or a binding already points at one invoice → return that invoice with `created = false` (no second invoice, no historical rebinding) |
| Conflict | Distinct invoice ids across those three sources → `binding_conflict` |
| Billable | Not deleted; status in `pending` / `confirmed` / `completed`; `payment_status ≠ paid`; `user_id` set; course same tenant |
| Payment method | Both `payment_method` and `agreed_payment_method` must already be `invoice` (rejects `wallee`, `cash_on_site`, `admin`, `reserved`, …) |
| Snapshot | All snapshot amount fields + `price_snapshot_at` required and consistent |
| Output | Draft invoice + one line item from course name; inserts binding; does **not** email, render, or set VAT bypass GUC |
| Credit | Remains on the snapshot; **not** folded into invoice header totals |

### Protect trigger updates

`course_registrations_protect_payment_fields` (replaced in this migration):

- Once `invoice_id` is non-null, changing it raises `invoice_link_frozen` (including for `service_role`)
- Non-`service_role` writers cannot set snapshot fields or `invoice_id` on INSERT/UPDATE (forced back to null/old)

---

## Pitfalls

1. **Expecting auto-invoices after applying the migration** — tenant default is `off`; no cron/API caller exists on `main`.
2. **Calling `issue_course_invoice` from the browser / authenticated JWT** — execute grant is service-role only.
3. **Passing amounts as RPC arguments** — amounts are read from snapshot columns only.
4. **Treating category `off` as “use tenant default”** — `off` is an explicit never-invoice override; `inherit` is the default that defers to the tenant.
5. **Confusing with appointment auto-invoice** — different tables and policy fields (`booking_policy`, `auto-invoice-on-complete`, scheduled invoice cron). Schema tests forbid wiring this migration into those paths.
6. **Assuming `course_registrations.invoice_id` uniqueness** — historical company invoices can still link many registrations; the **binding** table is the one-registration course-invoice uniqueness.
7. **Folding credit into invoice total** — credit stays on the snapshot; header uses net/vat/discount+voucher only.
8. **Applying without reading deploy comments** — file is schema-only; still requires a real Supabase apply before any future app RPC caller can succeed.

---

## Verify

```bash
# Static only: reads the SQL file; does not apply it to a database
npx vitest run server/utils/__tests__/course-invoice-phase1-schema.test.ts

# Confirm no app caller yet
rg -n 'issue_course_invoice|course_invoice_bindings|default_invoice_timing_mode' \
  --glob '!migrations/**' --glob '!**/course-invoice-phase1-schema.test.ts'
# Expect: no matches in product TS/Vue on this commit
```

---

## Codepaths / surfaces

| Path | Role |
|------|------|
| `migrations/20260928_course_invoice_phase1_schema.sql` | Entire phase 1 surface (DDL + functions + grants) |
| `server/utils/__tests__/course-invoice-phase1-schema.test.ts` | Static regression for defaults, grants, issuer rules, “no app wiring” |

Later phases (not on `main` yet) would add snapshot writers, timing schedulers, and Nitro/service wrappers around `issue_course_invoice` — document those only after they land.
