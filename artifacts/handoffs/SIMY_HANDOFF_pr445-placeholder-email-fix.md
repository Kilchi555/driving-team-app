# SIMY — Agent Handoff

## 1. Summary

- Status: CONDITIONAL PASS
- Task: Stop stored placeholder billing emails from blocking address updates on PR #445.
- What was accomplished: The allowlist accepts a recognized placeholder only when it exactly matches the email already stored on that invoice. Valid emails and `null` are unchanged. New malformed values are still rejected.
- Next action: Read CI on the new head. Do not merge #445 from this handoff.
- Human approval required: YES
- Abschlussurteil: `FIX IMPLEMENTED — AWAITING CI AND REVIEW`

## 2. Git State

- Repository: Kilchi555/driving-team-app
- Branch: `cursor/invoice-update-field-allowlist-c155`
- Starting HEAD, re-read live before the edit: `7802307efbe21b90ef11f1e391159feb0950a1bb`
- Base: `main` `f1efbe6d471584ecc1da0f621dabb52727088ec4`
- Pull request: https://github.com/Kilchi555/driving-team-app/pull/445
- Bugbot thread left unresolved: https://github.com/Kilchi555/driving-team-app/pull/445#discussion_r4293996289
- The commit that contains this file is the new PR head. Read `headRefOid` after push; do not treat an older SHA as the CI result.

## 3. Changes

- `server/utils/invoice-update-allowlist.ts`
- `server/api/invoices/update.post.ts`
- `server/utils/__tests__/invoice-update-allowlist.test.ts`
- `server/utils/__tests__/invoice-update.http.test.ts`
- `artifacts/handoffs/SIMY_HANDOFF_pr445-placeholder-email-fix.md`

## 4. Verification

- Local vitest, not CI: `./node_modules/.bin/vitest run server/utils/__tests__/invoice-update-allowlist.test.ts server/utils/__tests__/invoice-update.http.test.ts server/utils/__tests__/invoice-billing-snapshot.test.ts` — 3 files, 42 tests, exit 0 (vitest 3.2.7).
- Local eslint, not CI: `npx eslint "server/utils/__tests__/**/*.ts" --max-warnings 0` — exit 0. The same command on the four changed TypeScript files also exited 0.
- Required CI on the new head: NOT RUN at handoff write. Do not claim it passed.

## 5. Risks and Open Issues

- A placeholder is accepted only when the submitted string equals the stored `billing_email`. A different spelling is rejected even if `isPlaceholderBillingEmail` would recognize both.
- Exact `''` stays rejected. The preview already sends `null` for an empty editor value.
- The handler now reads the invoice before field validation, so a cross-tenant caller is denied before the allowlist runs. The write still uses `.eq('tenant_id', staffUser.tenant_id)`.
- CI on this commit is not known yet. App Store remains outside the required ruleset.

## 6. External Actions and Production Safety

- Commit created: YES, on the #445 branch
- Remote push: YES, if this file is on the remote with the commit
- Pull request created or updated: the existing PR #445 receives the push. Draft status was not changed.
- Merge: NO
- Deployment: NO
- Production database changes: NO
- Migration applied: NO
- Real customer or financial data changed: NO
- Bugbot thread resolved: NO

## 7. Next Step

- Exact recommended next action: Wait for Test and lint, E2E login, and Dependency review on the new head, then a person reviews the thread. Do not merge from this handoff.
- Required human decision or approval: merging #445 into `main`.
- If blocked, the precise blocker and the minimum action needed to unblock it: CI has not been observed on the new head.

---

## Root cause

`decideInvoiceUpdate` rejected every `billing_email` that failed `EMAIL_PATTERN`, and any rejected key rejected the whole update. `InvoicePreviewModal.saveViewBilling` resubmits `localViewBilling.email || null` together with the address. Stored `keine e-mail` therefore made a street or city save return 400.

`isPlaceholderBillingEmail` in `server/utils/invoice-billing-snapshot.ts` is the only billing-email placeholder contract in this repository. After trim and lowercasing it is true for an empty value or exactly `keine e-mail`. No other stored sentinel is defined. Staff-invite placeholders are a different helper and are real email shapes, so they already pass the pattern.

## Correction

The handler loads `billing_email` with the existing invoice row, after authentication and the `admin`/`staff` check, and before the update. A recognized placeholder is written only when it is character-for-character the stored value. A valid address still replaces it. `null` is still allowed. `''` is still rejected. `not-an-email` and a placeholder that is not already stored are rejected, including when street or house number fields are present. Payment, ownership, and unknown keys still reject the whole request. `billing_street_number` stays allowlisted with limit 20.

Tradeoff: the allowlist function cannot see the row by itself. Passing the stored email from the handler distinguishes an unchanged resubmit from a new invalid value, so validation is not opened to every non-address string.

## Security invariants

Unchanged: `getAuthenticatedUser`, role `admin` or `staff`, missing `tenant_id` rejected, `existingInvoice.tenant_id` compared with the staff tenant, update and detail read filtered by `.eq('tenant_id', staffUser.tenant_id)`, no `...updates`.

## Tests

Local commands and results are in section 4. They cover a valid email, `null`, `''`, the helper's recognized values (`keine e-mail`, `Keine E-Mail`, surrounding spaces, whitespace-only) only when stored exactly, an address save including `billing_street_number` `12a` with that placeholder, a malformed email, a new placeholder over a real email, payment fields with a placeholder, and a cross-tenant address update with the placeholder writing nothing.
