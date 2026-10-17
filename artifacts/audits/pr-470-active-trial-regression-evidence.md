# PR #470 — Active-Trial Regression Evidence Gap Closure

**Verdict: PASS — MOCKED REGRESSION EVIDENCE COMPLETE**

This closes the audit gap that active-trial **allow** was only proven at the pure-policy layer. The implementation already allowed valid active trials; no application-code defect was found. Evidence is **mocked/isolated automated tests only** — not live production or UI verification.

---

## Exact pins

| Field | Value |
|-------|-------|
| Observed at (UTC) | `2026-10-17T12:14:55Z` (pre-commit inspection) |
| PR | [#470](https://github.com/Kilchi555/driving-team-app/pull/470) (draft, OPEN) |
| Parent HEAD before this change | `d9ac2f572629a04b26d7a9d37b93139be6521cd8` |
| Test-evidence commit (tests + initial handoff) | `ec187b7af9827cd7eab1c6ead0d65395a98e4a03` |
| BASE (`main` / PR base) | `ef794668f909826057a713393333af2ed31b70d2` |
| Branch | `cursor/saas-subscription-write-guard-9780` |

Pre-change live `headRefOid` matched the expected pin `d9ac2f57`. This follow-up adds **tests + handoff docs only**; branch tip advances with subsequent docs-only commits on the same branch.

---

## Implementation check (no app defect)

`evaluateTenantSubscriptionWriteAccess` returns `{ writable: true, reasonCode: 'active_trial' }` for `is_trial: true` with future `trial_ends_at`. `assertTenantSubscriptionWritable` loads that snapshot and returns the same reason without throwing. `appointments/save` calls the real assert with the trusted tenant after C1 binding.

No production application source was modified.

---

## Files changed

| File | Change |
|------|--------|
| `server/utils/__tests__/assert-tenant-subscription-writable.test.ts` | Added active-trial allow case |
| `server/utils/__tests__/appointments-save-saas-c1.http.test.ts` | Added `activeTrialSnap`, update-filter capture, active-trial create + edit HTTP success |
| `artifacts/audits/pr-470-active-trial-regression-evidence.md` | This handoff |

---

## Commands and results

```bash
npx vitest run \
  server/utils/__tests__/assert-tenant-subscription-writable.test.ts \
  server/utils/__tests__/appointments-save-saas-c1.http.test.ts \
  utils/__tests__/tenant-subscription-write-access.test.ts \
  server/utils/__tests__/saas-subscription-write-guard.http.test.ts
# exit 0 — Test Files 4 passed; Tests 41 passed

npx vitest run \
  server/utils/__tests__/appointments-save-saas-c1.http.test.ts \
  server/utils/__tests__/assert-tenant-subscription-writable.test.ts \
  --reporter=verbose
# exit 0 — Tests 21 passed (11 assert + 10 C1)

npm run lint
# exit 0 — eslint server/utils/__tests/**/*.ts --max-warnings 0
```

---

## New active-trial success evidence

| Test | Result |
|------|--------|
| `assertTenantSubscriptionWritable > allows active trial tenant (writable) with active_trial reason` | **PASS** — real helper; `reasonCode === 'active_trial'` |
| `… C1 … > active-trial create succeeds and persists trusted caller tenant` | **PASS** — policy pre-check `active_trial`; HTTP success; exactly 1 insert; `tenant_id ===` caller; no updates |
| `… C1 … > active-trial edit succeeds using entity tenant and id+tenant update filters` | **PASS** — policy pre-check; HTTP success; update payload tenant forced; filters `{ id: APPT, tenant_id: CALLER_TENANT }`; no inserts |

Guard was **not** mocked to always allow. Supabase is mocked for isolation; tenant filters and real `assertTenantSubscriptionWritable` / policy evaluation remain under test.

---

## Existing paid-active regression (retained)

| Test | Result |
|------|--------|
| `allows active paid tenant (writable)` | **PASS** |
| `legitimate same-tenant edit succeeds when subscription is writable` | **PASS** |
| `create mode forces caller tenant and succeeds when writable` | **PASS** |

---

## Negative controls (still green)

| Test | Result |
|------|--------|
| `denies expired trial with 402…` | **PASS** |
| `superadmin editing expired-tenant appointment is blocked… (402)` | **PASS** — zero updates |
| `staff cannot edit another tenant appointment by eventId alone` | **PASS** — 404; zero updates |
| `writable caller tenant cannot make an expired target…` | **PASS** |
| `superadmin cannot redirect… via writable body tenant_id` | **PASS** — 403; zero updates |
| `edit denial for expired entity… when body tenant is writable` | **PASS** — 403; zero updates |
| `create mode uses authenticated caller tenant, not… foreign` | **PASS** — 403; zero inserts |
| `fails closed on subscription lookup error (503…)` | **PASS** |

---

## Explicit non-actions

- Application runtime code **not** changed.
- Production / shared staging **not** written.
- Real customer appointments **not** created or edited.
- PR **not** undrafted, merged, or deployed.
- Subscription guard **not** weakened or stubbed to always allow.
- Runtime configuration / migrations **not** changed.

---

## Remaining gaps (not claimed closed)

- No EventModal / browser E2E under trial or paid.
- No production or staging customer evidence.
- Mocked HTTP success ≠ live production verification.

A full production-safety **PASS** still requires human review and any authorized non-mocked verification the product owners require.

---

## Verdict

**PASS — MOCKED REGRESSION EVIDENCE COMPLETE**

Active-trial and paid-active create/edit success through `POST /api/appointments/save` are now covered by isolated automated tests with the real subscription assertion path. Human review remains required before merge.
