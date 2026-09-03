# F-04 Remediation — Voucher Manage IDOR / Missing Tenant Ownership

**Date:** 2026-09-03  
**Scope:** F-04 only (`POST /api/vouchers/manage`)  
**Branch:** `cursor/f04-remediation-bb9a`  
**Status:** REMEDIATED in code (awaiting merge/deploy)

---

## Root Cause

`manage.post.ts` authenticated with `getAuthenticatedUser` but:

| Action | Defect |
|--------|--------|
| `load` | `body.userId \|\| user.id` — auth UUID ≠ `users.id`; no tenant filter |
| `find-by-code` | Global code lookup across tenants |
| `create` | Mass-assignment `insert([body.voucherData])`; broken admin/owner check |
| `redeem` | Update by `voucherId` only — cross-tenant burn |

---

## Changes

| File | Change |
|------|--------|
| `server/api/vouchers/manage.post.ts` | `getAuthenticatedUserWithDbId`; force `tenant_id`; staff-gated cross-user load/create; create allowlist; tenant-scoped find/redeem |
| `server/utils/__tests__/f04-vouchers-manage-remediation.test.ts` | Contract tests |
| `audits/2026-09-03-f04-remediation.md` | This report |

**Caller:** `composables/useVouchers.ts` unchanged (still posts load/create/find-by-code). Primary redeem remains `/api/vouchers/redeem`.

---

## Authorization Matrix

| Action | Customer | Staff (same tenant) |
|--------|----------|---------------------|
| load self | ✅ | ✅ |
| load other userId | 403 | ✅ if target in tenant |
| find-by-code | tenant only | tenant only |
| create | **403** (no unpaid mint) | ✅ whitelisted + forced tenant |
| create for other | 403 | ✅ if owner in tenant |
| redeem | own voucher in tenant | any voucher in tenant |

**Paid issuance:** `/api/vouchers/create-after-purchase` (internal secret) — not customer `manage` create.

---

## Out of scope

F-06…F-08, `/api/vouchers/redeem` guest path hardening, invoice IDOR.

---

## Follow-up (Bugbot High)

Customer `create` previously defaulted ownership to caller and accepted client amounts — unpaid mint.
**Fix:** `create` is staff-only; paid vouchers remain on `create-after-purchase`.

## Verdict

**F-04 code remediation: COMPLETE for scope (incl. no unpaid customer mint)**  
**Production Blocker until merge + deploy:** YES  
**Do not merge until CI green + this invariant holds.**
