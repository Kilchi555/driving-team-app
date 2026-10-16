# SIMY — Agent Handoff

## 1. Summary

- Status: CONDITIONAL PASS
- Task: Compatibility gate between draft PR #454 and draft PR #445 for `billing_street_number` on `POST /api/invoices/update`.
- What was accomplished: Live GitHub state of both PRs was read. The allowlist conflict is confirmed. A stacked draft, PR #456, allows only that column on the #445 allowlist and keeps forbidden fields rejected. Nothing was merged or deployed.
- Next action: A person reviews draft PR #456 and, if it is accepted, merges it into `cursor/invoice-update-field-allowlist-c155` before PR #445 merges to `main`.
- Human approval required: YES
- Abschlussurteil: `FIX REQUIRED — ALLOWLIST CONFLICT CONFIRMED`

## 2. Git State

- Repository: Kilchi555/driving-team-app
- Observed at: 2026-10-16, after `git fetch` of `main`, `cursor/invoice-update-field-allowlist-c155`, and `cursor/invoice-preview-street-number-save-4000`.
- `origin/main`: `f1efbe6d471584ecc1da0f621dabb52727088ec4` — `fix(booking): group slot days by the tenant-local date (#452)`. This is newer than the previously reported base `a75e065eed1ed7143b0e49718976b9b0209979bd`.
- PR #454: OPEN, draft unchanged. Head `dcd6039b75ac137a8e408056172206bb8d3de7c2` matches the expected head. Base `main` at `a75e065eed1ed7143b0e49718976b9b0209979bd`. Branch `cursor/invoice-preview-street-number-save-4000`. https://github.com/Kilchi555/driving-team-app/pull/454
- PR #445: OPEN, draft unchanged. Head `976985efcae0670f00850d550352e63c5b1dfed6`. Base `main` at `254a2d95e770ae69153631fe406ddb74560baec3`. Branch `cursor/invoice-update-field-allowlist-c155`. Author Kilchi555. https://github.com/Kilchi555/driving-team-app/pull/445
- Fix branch: `cursor/invoice-update-street-number-allow-4000`, created from #445 head `976985ef`. Code commit `5bf79f0c26e3919bf3884e6ebdeed666e0c418fd`. This handoff is a later commit; the live `headRefOid` of PR #456 is authoritative.
- Pull request: https://github.com/Kilchi555/driving-team-app/pull/456 (Draft). Base is `cursor/invoice-update-field-allowlist-c155` at `976985ef`, not `main`.
- Working tree: `artifacts/handoffs/SIMY_HANDOFF_pr442-post-merge.md` stays untracked and is not part of this commit. PR #445 and PR #454 were not overwritten.

## 3. Changes

- Files changed on the stacked branch:
  - `server/utils/invoice-update-allowlist.ts`
  - `server/utils/__tests__/invoice-update-allowlist.test.ts`
  - `server/utils/__tests__/invoice-update.http.test.ts`
  - `artifacts/handoffs/SIMY_HANDOFF_pr454-pr445-compatibility.md`
- Important implementation details: `billing_street_number` is an allowed string field with limit 20. `''` stays `''`. `update.post.ts` was not edited.
- Requested work not completed: no merge, no draft-status change on #445 or #454, no production write.

## 4. Verification

- Unit and endpoint tests: PASS locally. `./node_modules/.bin/vitest run server/utils/__tests__/invoice-update-allowlist.test.ts server/utils/__tests__/invoice-update.http.test.ts` — 2 files, 27 tests, exit 0 (vitest 3.2.7). This includes the new cases for `''`, `12a`, a 21-character number, and `payment_status` combined with a house number.
- Integration tests: the HTTP file above is the endpoint test. It uses a mocked Supabase client, not a database.
- E2E tests: NOT RUN locally.
- Lint: PASS locally. `npx eslint "server/utils/__tests__/**/*.ts" --max-warnings 0`, exit 0.
- Typecheck: NOT RUN as a project check. An isolated `tsc` of `server/utils/invoice-update-allowlist.ts` exited 2 on a pre-existing narrowing error at the existing `validated.value` read and an unrelated `@types/request` `CookieJar` error. The new key is present in the exhaustive `STRING_LIMITS` record.
- Required CI checks for PR #456: NOT RUN to completion at handoff time. On head `5bf79f0c`, `Test and lint` and `E2E login` were pending. `Dependency review` had not appeared yet. These are CI results, separate from the local vitest and eslint runs.
- Required CI for PR #454, observed on head `dcd6039b`: Test and lint pass, E2E login pass, Dependency review pass. `App | Default` failed and is not a required ruleset check.
- Required CI for PR #445, observed on head `976985ef`: Test and lint pass, E2E login pass, Dependency review pass. `App | Default` failed and is not a required ruleset check.
- Production smoke test: NOT RUN

## 5. Risks and Open Issues

- Known risks: merging PR #445 as it stands, while PR #454 is also merged, makes the preview save return 400. PR #456 is the remedy and is still a draft.
- Failed or missing checks: PR #456 required CI was not terminal when this handoff was written. App Store failures on #445 and #454 are outside the merge ruleset.
- Unverified assumptions: none about the allowlist conflict. The custom-domain production SHA is outside this task.
- Remaining limitations: #445 is three commits behind current `main`, and #454 is one commit behind. The newer main commit is the booking-timezone fix #452 and does not touch this endpoint or the preview modal. Neither PR was rebased.

## 6. External Actions and Production Safety

- Commit created: YES — code `5bf79f0c26e3919bf3884e6ebdeed666e0c418fd`; this handoff is a following commit.
- Remote push: YES — `cursor/invoice-update-street-number-allow-4000`
- Pull request created or updated: YES — Draft https://github.com/Kilchi555/driving-team-app/pull/456
- Merge: NO
- Deployment: NO
- Production database changes: NO
- Migration applied: NO
- Real customer or financial data changed: NO
- Other externally visible side effects: NO. Draft status of #445 and #454 was not changed.

## 7. Next Step

- Exact recommended next action: Review draft PR #456. If accepted, merge that draft into `cursor/invoice-update-field-allowlist-c155` before PR #445 merges to `main`. Do not merge #445 while its allowlist still omits `billing_street_number` if #454 will also merge.
- Required human decision or approval: merging #456 into the #445 branch, and any later merge of #445 or #454 into `main`.
- If blocked, the precise blocker and the minimum action needed to unblock it: the blocker is the confirmed allowlist gap on #445 head `976985ef`. The minimum code change is the one commit already on PR #456.

---

## Abschlussurteil

`FIX REQUIRED — ALLOWLIST CONFLICT CONFIRMED`

## PR-Zustand

| PR | Status | Draft | Head | Base | Required CI at observation |
| --- | --- | --- | --- | --- | --- |
| #454 | OPEN | yes, unchanged | `dcd6039b75ac137a8e408056172206bb8d3de7c2` | `a75e065eed1ed7143b0e49718976b9b0209979bd` | Test and lint, E2E login, Dependency review: pass |
| #445 | OPEN | yes, unchanged | `976985efcae0670f00850d550352e63c5b1dfed6` | `254a2d95e770ae69153631fe406ddb74560baec3` | Test and lint, E2E login, Dependency review: pass |
| #456 | OPEN | yes | code `5bf79f0c26e3919bf3884e6ebdeed666e0c418fd`; live head includes this handoff | #445 branch `976985ef` | pending on the code commit; re-check the live head |

`origin/main` is `f1efbe6d471584ecc1da0f621dabb52727088ec4`.

## Konflikt

On current `main`, `POST /api/invoices/update` spreads `updates` after an `admin`/`staff` role check and `.eq('tenant_id', staffUser.tenant_id)`. `billing_street_number`, including `''`, is accepted and stored. There is no allowlist on `main`.

PR #454 does not change that route. Its preview save calls `viewBillingUpdatePayload`, which sends `billing_street` without a joined number and `billing_street_number: editor.street_nr ?? ''`.

PR #445 replaces the spread with `decideInvoiceUpdate`. Any key outside the allowlist rejects the whole request. The allowlist on `976985ef` has `billing_street` and does not have `billing_street_number`. The #454 payload would therefore return 400 and write nothing.

## Aufrufer

`POST /api/invoices/update` is called from:

- `composables/useInvoices.ts` send and mark-as-sent: `status`, `sent_at`
- `composables/useInvoices.ts` cancel: `status`, `notes`
- `components/InvoicePreviewModal.vue` `saveViewBilling`: billing address fields. On `main` the number is omitted. On #454 the number is included, including `''`.

`markInvoiceAsPaid` uses `/api/invoices/mark-invoice-paid`. The detail editor uses `/api/admin/invoice-save`, and the staff editor uses `/api/staff/update-invoice`. Those routes already name `billing_street_number` and are not opened by this allowlist change.

The added field does not add a new caller or a new role. Payment, tenant, owner, total, credit, dunning, and document fields still reject the entire request.

## Merge-Reihenfolge

- #454 alone onto current `main` is safe: `main` still stores the number.
- #445 alone onto current `main` is safe for the callers that exist on `main`, and it rejects the number the moment the #454 payload is live.
- The two PRs are not safe in either order while #445 lacks the field.
- Safe order: merge #456 into the #445 branch, then merge #445 and #454 to `main` in either order. Do not rebase either PR as part of this fix. #452 does not touch these files.

## Änderungen

`billing_street_number` was added beside `billing_street`, with limit 20. Empty string is preserved by the existing non-email string validator. Authentication, the role check, and both `tenant_id` comparisons in `update.post.ts` are unchanged. No historical invoices, PDFs, or migrations were touched.

## Tests

Local, not CI:

- vitest 3.2.7, exit 0, 27 passed. New coverage: store `''` and `12a`; reject 21 characters; reject `billing_street_number` together with `payment_status: 'paid'` and write nothing.
- eslint on `server/utils/__tests__/**/*.ts`, exit 0.

CI:

- #454 and #445 required checks were green on the heads above.
- #456 required checks were not terminal at handoff time. Do not treat this handoff as a green CI result for #456.

## Verbleibende Risiken

- #456 must land on the #445 branch before #445 merges, if #454 will also merge.
- #445 remains behind `main` by the booking commit and earlier main commits. That is unrelated, and it was not rebased here.
- A retarget of #456 onto `main` would pull the whole #445 diff into that PR. Leave the base as `cursor/invoice-update-field-allowlist-c155`.
- Project-wide typecheck was not run.

## Menschliche nächste Aktion

Review https://github.com/Kilchi555/driving-team-app/pull/456. If the one-field diff is accepted, merge that draft into the #445 branch before #445 merges to `main`. Do not merge #445, #454, or #456 to `main` from this handoff.

## Implementation gate

- Change class: API, authorization field allowlist.
- Change risk: MEDIUM. One already-authorized billing column is added. Auth, roles, tenant filter, RLS, and payment routes are not modified.
- Hotspots: no P0 file was edited. `update.post.ts` still calls `getAuthenticatedUser`, checks `admin`/`staff`, requires `tenant_id`, compares `existingInvoice.tenant_id`, and updates with `.eq('tenant_id', staffUser.tenant_id)`.
- Approval: the compatibility-gate request explicitly asked for this field and these tests if #445 blocked the house number.
- Scope kept: no other allowlist key was added.
