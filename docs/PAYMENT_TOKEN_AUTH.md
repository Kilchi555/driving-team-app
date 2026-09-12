# Payment token get/save auth (F-03)

**When to use:** Debugging 401/403/404 on payment-token routes; wiring webhook → save-token; reviewing cross-space Wallee transaction lookups.

Verified against source (Sep 2026). Commit `9e9d8b0f` (#142). Detail audit: `audits/2026-09-03-f03-remediation.md`.

Related: [WALLEE_PAYMENT_RECOVERY.md](./WALLEE_PAYMENT_RECOVERY.md) (webhook / pending recovery).

---

## Intent

`get-user-payment-token` and `save-payment-token` previously accepted body `userId` / `tenantId` without a trustworthy actor. Unauthenticated callers could read or write another customer’s stored payment method. F-03 binds every call to either:

1. a **verified internal secret** plus the payment row for a Wallee transaction, or  
2. an **authenticated session** that owns that payment / token scope.

Transaction IDs alone are **not** unique across Wallee spaces — lookups always need `tenantId` and/or `spaceId` (`wallee_space_id`).

---

## Contract

### `authorizeSavePaymentToken` (`server/utils/payment-token-auth.ts`)

| Mode | Gate | Identity source |
|------|------|-----------------|
| `internal` | `x-internal-secret` / `x-internal-api-secret` matches `INTERNAL_API_SECRET` (or `NUXT_INTERNAL_API_SECRET`) | Payment row for `transactionId` + `tenantId`/`spaceId` → `user_id` + `tenant_id` |
| `owner` | Session via `getAuthenticatedUserWithDbId` | Same payment row; must match session `user.id` + `tenant_id` |

Required body field: `transactionId`. Optional: `spaceId`, `tenantId` (hint for internal; owner path uses session tenant).

### `authorizeGetUserPaymentToken`

| Mode | Gate | Identity source |
|------|------|-----------------|
| `owner` only | Authenticated session | Session `user.id` + `tenant_id` |

Body `userId` / `tenantId` are **ignored**.

### Surfaces

| Endpoint | Authorizer |
|----------|------------|
| `POST /api/wallee/save-payment-token` | `authorizeSavePaymentToken` |
| `POST /api/booking/get-user-payment-token` | `authorizeGetUserPaymentToken` |

Webhook / server paths that save tokens must send the internal secret header (see `internalSecretHeaders()` in `require-staff-or-internal.ts`).

---

## Lookup rules

`loadPaymentForTransaction`:

- Filters `payments` by `wallee_transaction_id`.
- Requires at least one of `tenantId` or `spaceId` — otherwise **400**.
- **0 rows** → treat as not found (**404** for callers).
- **>1 rows** → **409** ambiguous — refine space/tenant.

Never trust body `userId` for the write target when in internal mode; always use the payment row’s `user_id`.

---

## Pitfalls

- Missing internal secret on webhook-driven save → falls through to session path → **401**.
- Passing only `transactionId` without space/tenant → **400** (cross-space collision guard).
- Session caller for another user’s payment → **403** even if they know the transaction id.
- Do not reintroduce “trust body userId when unauthenticated”.

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/payment-token-auth.ts` | Authorizers + payment lookup |
| `server/utils/require-staff-or-internal.ts` | Internal secret check / headers |
| `server/api/wallee/save-payment-token.post.ts` | Save token |
| `server/api/booking/get-user-payment-token.post.ts` | Load token for booking |
| `server/api/wallee/webhook.post.ts` | May trigger token persistence with internal auth |
| `server/utils/__tests__/f03-payment-token-remediation.test.ts` | Unit coverage |
| `audits/2026-09-03-f03-remediation.md` | Full remediation report |
