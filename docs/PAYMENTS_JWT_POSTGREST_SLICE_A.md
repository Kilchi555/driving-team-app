# Payments JWT/PostgREST write closure (Slice A)

**When to use:** Staff EventModal / payment reminder flows fail with RLS or “permission denied for table payments”; browser JWT can still `INSERT`/`UPDATE` `public.payments`; debugging #232; distinguishing SELECT (still allowed) from writes (server-only).

Verified against source (Sep 2026). Merge `70716fcd` (#232). Migration is **create-only** and must be applied manually (`Do not apply automatically to production`).

Related but separate:

- Staff appointment **amount** quoting (#218) — `docs` PR #225 / `STAFF_APPOINTMENT_SERVER_QUOTE` when merged; this runbook covers **who may write payment rows**, not price math.
- Wallee wallet credit / remaining amount (#219/#224) — separate integrity paths.
- F-3 anon containment (#231) — vouchers/slots/waitlist only; does **not** touch `payments`.
- Course public enroll identity (#239) — see `COURSE_PUBLIC_ENROLL_IDENTITY.md`.

---

## Intent

Stop authenticated (and anon) JWTs from creating or mutating `public.payments` through PostgREST. Monetary and non-monetary payment fields move through Nitro routes that use `service_role` (BYPASSRLS). Legitimate **SELECT** policies for staff/customer/super-admin remain so UIs can still list payment status.

| Boundary | After #232 |
|----------|------------|
| Data API `INSERT` / `UPDATE` / `DELETE` on `payments` | Revoked from `anon` and `authenticated` |
| Staff/customer/super-admin write policies | Dropped (`staff_insert_tenant`, `customer_insert_own`, `staff_update_tenant`, `super_admin_*`, leftover `anon_insert_shop_payment`) |
| SELECT | Kept via existing RLS read policies + `GRANT SELECT` to `authenticated` |
| Server writes | `service_role` only (`GRANT ALL` to `service_role`) |

---

## Contract

### Client must not write `payments`

| Surface | After #232 |
|---------|------------|
| `utils/paymentService.ts` `createPaymentRecord` / status / Wallee-id updates | Throws: use a server payment API |
| `composables/useEventModalForm.ts` | Persist via `POST /api/appointments/save` (payment create/update owned by server) |
| `composables/useReminderService.ts` reminder stamp | `POST /api/staff/record-payment-reminder` (no monetary columns) |
| Browser Supabase client `.from('payments').insert/update` | Must fail after migration apply |

### Server write owners

| Route / helper | Role |
|----------------|------|
| `POST /api/appointments/save` | Staff appointment + payment create/update; amounts from server quote path; maps payment method; C1 invoice metadata |
| `POST /api/staff/record-payment-reminder` | Staff/admin only; stamps `last_reminder_*` + `metadata.reminder_history` |
| Existing Wallee / process / credit / discount Nitro routes | Unchanged ownership: still `getSupabaseAdmin()` |

### C1 invoice metadata semantics (save)

Omitted body fields ≠ explicit clear:

- `companyBillingAddressId` / `invoiceAddress` / `paymentNotes` only update when present on the request body (`bodyHasOwn`).
- Non-invoice payment methods **clear** `invoice_address` (must not leave a stale snapshot).
- Invoice method: object → persist snapshot; explicit null/empty when provided → clear.
- Helper: `utils/staff-payment-c1-metadata.ts` (`buildStaffC1PaymentMetadata`) for client payload shaping before save.

---

## Migration & apply

File: `migrations/20260917_payments_jwt_postgrest_slice_a.sql`

- Idempotent: `DROP POLICY IF EXISTS` + `REVOKE`
- Does **not** create anon INSERT, triggers, or alter vouchers/slots/waitlist
- Does **not** change SELECT policy definitions beyond relying on remaining ones + grant

Apply manually in the target Supabase project after review. Until applied, production may still allow JWT writes even though `main` contains the SQL and client throws.

Table comment after apply:

> Slice A (2026-09-17): JWT/PostgREST cannot INSERT/UPDATE/DELETE payments. Reads via RLS SELECT. Writes via service_role server routes only.

---

## Pitfalls

1. **“Permission denied for table payments” on insert/update** — expected for browser JWT after apply. Fix the caller to use a Nitro route, do not re-GRANT DML to `authenticated`.
2. **Re-adding `staff_insert_tenant` / client inserts “for speed”** — undoes Slice A. Amounts and metadata must stay server-owned.
3. **Reminder stage not recorded** — UI must call `/api/staff/record-payment-reminder`; direct `.update({ last_reminder_sent_at })` will fail.
4. **Invoice address wiped on routine edit** — EventModal must omit uninitialized C1 fields (omit ≠ null). Sending `null` for omitted billing state clears stored metadata.
5. **CSV / old audits listing customer/anon INSERT** — historical; this runbook + CSV patches after #232 are authoritative for write grants.
6. **Confusing with HOCH-01 (anon shop insert only)** — March 2026 audit dropped anon shop insert; #232 closes the remaining **authenticated** write path.

---

## Codepaths

| Path | Notes |
|------|-------|
| `migrations/20260917_payments_jwt_postgrest_slice_a.sql` | Policy drops + DML revokes |
| `server/utils/__tests__/payments-jwt-postgrest-slice-a.test.ts` | SQL + client-tree contract |
| `server/api/appointments/save.post.ts` | Staff payment persist + C1 metadata |
| `server/api/staff/record-payment-reminder.post.ts` | Reminder metadata stamp |
| `utils/staff-payment-c1-metadata.ts` | Invoice/billing metadata builder |
| `utils/paymentService.ts` | Write helpers intentionally throw |
| `composables/useEventModalForm.ts` | Save-only payment ownership |
| `composables/useReminderService.ts` | Reminder API call |

---

## Quick verify

```bash
npx vitest run server/utils/__tests__/payments-jwt-postgrest-slice-a.test.ts
npx vitest run utils/__tests__/staff-payment-c1-metadata.test.ts
```

After SQL apply, confirm JWT cannot `INSERT`/`UPDATE` `payments`, while `POST /api/appointments/save` and reminder recording still succeed with a staff session.
