# Online booking payment methods (cash / invoice / Wallee)

**When to use:** Tenant “cash appears on guest booking”; invoice option missing online; reviewing `online_payment_methods` from booking init; debugging rejected `payment_method` on create/guest-book.

Verified against source (Sep 2026). Commits `c95ac2ab` (#137), `d17ebaf9` (#138).

---

## Intent

Public online booking must honor **tenant payment settings**, not a hard-coded Wallee-only path and not a client-supplied `payment_method=cash` when cash is staff-only. Guests and public booking may only get methods the school enabled for customers.

---

## Policy (`resolve-online-booking-payment-method.ts`)

Built from `tenant_settings` category `payment` / key `payment_settings` (plus tenant `wallee_enabled`):

| Method | Enabled when |
|--------|----------------|
| `wallee` | `walleeEnabled !== false` (default on) |
| `invoice` | `invoice_payments_enabled === true` |
| `cash` | `cash_payments_enabled !== false` **and** `cash_payment_visibility === 'customers_and_staff'` |

`default_payment_method` is normalized via `normalizeTenantPaymentMethod`. Fallback order: preferred default if allowed, else first of `wallee` → `invoice` → `cash`. If nothing would be allowed, allow-list collapses to **`['wallee']`**.

### Resolve request

`resolveOnlineBookingPaymentMethod({ requested, policy })`:

- If `requested` is `wallee` | `invoice` | `cash` and in allow-list → use it (`rejectedRequest: false`).
- If requested but **not** allowed → use fallback (`rejectedRequest: true`) — **does not** write the rejected method.
- If omitted / unknown → fallback.

`onlineBookingPaymentProvider(method)` returns `'wallee'` only for Wallee; cash/invoice → `null`.

---

## Surfaces

| Surface | Behavior |
|---------|----------|
| `GET /api/booking/get-booking-init` | Returns `online_payment_methods`, `default_online_payment_method`, plus legacy flags `cash_visible_for_customer`, `invoice_payments_enabled` |
| `POST /api/booking/create-appointment` | Loads policy, resolves method, persists resolved method only |
| `POST /api/booking/guest-book` | Same — guest path must not stamp cash when visibility is staff-only |
| Admin profile payment settings | Source of truth for flags above |

UI (`pages/booking/availability/[slug].vue`) should offer only methods from `online_payment_methods`.

---

## Pitfalls

- Client sends `payment_method=cash` while visibility is staff-only → server falls back; do not treat body as authoritative.
- `cash_payments_enabled` alone is not enough — **visibility** must be `customers_and_staff` for public cash.
- Invoice stays off until `invoice_payments_enabled` is explicitly true.
- Empty allow-list never stays empty — code forces Wallee so checkout does not soft-lock.

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/resolve-online-booking-payment-method.ts` | Policy + resolve + provider helper |
| `server/utils/tenant-default-payment-method.ts` | Parse / normalize settings |
| `server/api/booking/get-booking-init.get.ts` | Public init payload |
| `server/api/booking/create-appointment.post.ts` | Authenticated / returning online book |
| `server/api/booking/guest-book.post.ts` | Guest online book |
| `pages/booking/availability/[slug].vue` | Booking UI method picker |
| `pages/admin/profile.vue` | Tenant payment settings UI |
| `server/utils/__tests__/resolve-online-booking-payment-method.test.ts` | Unit coverage |
