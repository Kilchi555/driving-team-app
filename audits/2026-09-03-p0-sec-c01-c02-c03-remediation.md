# P0 Remediation — SEC-C01 / C02 / C03

**Date:** 2026-09-03  
**Branch:** `cursor/p0-remediation-c01-c02-c03-3e7f`

## SEC-C01

- **Mechanism:** BEFORE UPDATE trigger `prevent_users_privilege_escalation` + column REVOKE attempt
- **Live:** v2 applied on `unyjaetebnaexaflpyoc` — authenticated JWT denied on role/tenant_id/admin_level; service_role allowed
- **Note:** Column REVOKE may remain ineffective under Supabase grant layout; trigger is the enforceable control

## SEC-C02

- `requireSuperAdmin(event)` at start of `marketing-overview.get.ts`

## SEC-C03

- `requireAdminProfile` + tenant isolation
- `dispatchAppointmentConfirmation` for email
- No `confirmationToken` / `confirmationLink` in response or logs

## Tests

`server/utils/__tests__/p0-sec-c01-c02-c03-remediation.test.ts`
