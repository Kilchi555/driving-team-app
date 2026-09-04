# F-03 Remediation — Unauthenticated Payment Token Get/Save

**Date:** 2026-09-03  
**Scope:** F-03 only (`POST /api/booking/get-user-payment-token`, `POST /api/wallee/save-payment-token`)  
**Branch:** `cursor/f03-remediation-bb9a`  
**Status:** REMEDIATED in code (awaiting merge/deploy)

---

## Root Cause

Both endpoints used the **service role** and trusted **body** `userId` / `tenantId` with **no authentication**:

1. `get-user-payment-token` — anyone could enumerate payment method IDs for arbitrary users.
2. `save-payment-token` — anyone could attempt to bind a Wallee token to an arbitrary user/tenant. The Wallee webhook already sent `internalSecretHeaders()`, but the handler **ignored** the secret.

---

## Changes

| File | Change |
|------|--------|
| `server/utils/payment-token-auth.ts` | Shared authz: internal secret → bind to `payments` row by `wallee_transaction_id`; session → owner match |
| `server/api/wallee/save-payment-token.post.ts` | Uses `authorizeSavePaymentToken`; identity from payment/session, not body alone |
| `server/api/booking/get-user-payment-token.post.ts` | Requires session; uses `db` user + tenant only |
| `server/utils/__tests__/f03-payment-token-remediation.test.ts` | Contract + unit tests (401/403/404, internal bind) |
| `audits/2026-09-03-f03-remediation.md` | This report |

**Webhook:** still calls `save-payment-token` with `internalSecretHeaders()` — now required and verified.

---

## Authorization Matrix

| Caller | Auth | Identity source |
|--------|------|-----------------|
| Unauthenticated | **401** | — |
| Internal (`x-internal-secret`) | Allowed | `payments.user_id` / `tenant_id` for `transactionId` |
| Session owner | Allowed if payment belongs to session | Session `db` user + tenant |
| Session, foreign payment | **403** | — |
| Internal, unknown txn | **404** | — |

---

## Security Tests

| ID | Scenario | Result |
|----|----------|--------|
| **A** | Unauth save with attacker body IDs | **PASS** (unit: 401) |
| **B** | Unauth get | **PASS** (unit: 401) |
| **C** | Internal secret + body IDs for wrong user | **PASS** (unit: identity from payment row) |
| **D** | Owner session + foreign payment | **PASS** (unit: 403) |
| **E** | Webhook still sends internal secret | **PASS** (contract) |

Live production probes: after deploy only.

---

## Out of scope

F-04…F-08, invoice IDOR, Wallee amount/credit (F-06), inactive-user gate (F-07).

---

## Verdict

**F-03 code remediation: COMPLETE for scope**  
**Production Blocker until merge + deploy:** YES
