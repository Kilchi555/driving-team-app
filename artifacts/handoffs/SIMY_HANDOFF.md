# SIMY Handoff — PR #431 Final Pre-Merge Validation

**Date:** 2026-10-14  
**Recommendation:** **NOT READY** (required E2E login must re-pass after this push; email E2E signup still not run)

## Identity

| Item | Value |
|------|--------|
| PR | https://github.com/Kilchi555/driving-team-app/pull/431 (draft) |
| Branch | `cursor/tenant-registration-abuse-protection-26c8` |
| PR base OID (GitHub) | `0770ad2e` (`main` at PR open) |
| Expected base | `0770ad2e` — **confirmed** |
| `origin/main` at validation | `3b7fc0dd` (1 commit ahead of PR base: read-only PR review-state comment) |
| Prior implementation SHAs | `64cc4202`, `5bd73152` |
| Validation fix SHA | `8dc70643` (head after this validation) |
| New commits since prior report | yes — `8dc70643` |

## Files changed (full PR vs `0770ad2e`)

Migration / server / UI / docs / tests for registration abuse protection, including validation fixes:

- `sql_migrations/20261014_tenant_registration_abuse_protection.sql`
- `server/utils/rate-limiter.ts`, `registration-email-verification.ts`, `registration-token.ts`, `hcaptcha.ts`, `ip-utils` usage
- `server/api/tenants/{register,verify-registration-email,resend-registration-verification,create-admin,invite-staff-batch,rollback-registration,check-availability}.*`
- `pages/tenant-register.vue`, `pages/tenant-register/verify.vue`
- `docs/incidents/2026-10-14_tenant-registration-abuse-{rca,rollout}.md`
- Tests under `server/utils/__tests__/`

## Confirmed fixes in this validation pass (`8dc70643`)

1. **E2E login root cause (confirmed):** Phase 2 made *all* fail-closed ops (including `login`) deny when `consume_rate_limit` RPC missing. Vercel preview DB is unmigrated → logins denied → E2E stuck on `/login`.  
   **Fix:** `REQUIRE_ATOMIC_RPC_OPERATIONS` for registration/admin abuse only; `login`/`register`/`password_reset` may use awaited insert-then-count when RPC missing (legacy CHECK compatible).
2. **`invite-staff-batch` authz gap:** now requires `registration_token` + `getClientIP` + `checkRateLimit` + verified/active gate. Frontend passes token.
3. **Verify refresh stranding:** used email token re-issues HMAC `registration_token` only while tenant verified/active and **no admin** exists.
4. **Register mail 503 orphan:** response `data` includes `tenant_id` / email / slug for verify-wait + resend; still no `registration_token`.

## Checks executed

| Check | Result | Evidence |
|-------|--------|----------|
| GitHub **Test and lint** (on `5bd73152`) | **PASS** | Actions run `38597271334` job success |
| GitHub **E2E login** (on `5bd73152`) | **FAIL** | Login stayed on `/login` for apple-review + e2e-isolation; caused by atomic-RPC fail-closed on `login` pre-migration |
| GitHub CodeQL / Dependency review / Analyze | **PASS** | PR checks on `5bd73152` |
| Apple App Store CI | **FAIL** (not a Ship-to-main required Actions check) | External App Store Connect |
| Local vitest (registration hardening suite) | **PASS** | 6 files / **27** tests after fixes (`rate-limiter*`, registration-email-verification, contract, ip-utils-spoof, hcaptcha) |
| Local `npm run lint` (CI scope: `server/utils/__tests__/**/*.ts`) | **PASS** | exit 0 |
| Full `npm test` (all packages) | **NOT RUN** | Not executed in this pass; rely on CI Test and lint after push |
| GitHub CI on `8dc70643` | **NOT RUN YET** at handoff write — push triggers re-run |
| Staging migration (simy-test `kssqalisscxkhvorqwgy`) | **PASS** (reconfirmed) | allowlist+advisory lock+token table present; sequential consume max=2 → 2 allowed + 1 blocked; idempotent OR REPLACE/IF NOT EXISTS OK |
| Production migration (`unyjaetebnaexaflpyoc`) | **PASS (unapplied)** | old three-value CHECK; no token table |
| Email delivery + full non-prod signup E2E (Resend + UI) | **BLOCKED / NOT RUN** | `RESEND_API_KEY` missing in agent env; no safe real mailbox flow executed |
| Captcha live enablement E2E | **NOT RUN** | Unit tests PASS; `TENANT_REGISTER_REQUIRE_HCAPTCHA` / secret unset in agent — policy: optional until flag=1 |
| True multi-session limiter concurrency | **NOT RUN** | Single-session sequential atomic consume validated on simy-test; no dblink/multi-connection harness |

## Staging / E2E evidence summary

- **simy-test:** migration `tenant_registration_abuse_protection_20261014` present; CHECK includes `tenant_register`; `pg_advisory_xact_lock` in `consume_rate_limit`; token consume previously validated; idempotency fragments OK.
- **Production:** untouched.
- **App E2E signup with email:** not completed (missing Resend in agent). Rollout checklist §4 remains for human staging after preview redeploy + migration on the preview DB **or** after this login fallback fix on unmigrated preview.

## Remaining risks / blockers

1. **Required check:** E2E login must go green on head `8dc70643` after push (was red on `5bd73152`).
2. **Email signup E2E** still outstanding for full confidence (Resend + verify link + create-admin on non-prod).
3. **Deploy before migrate:** registration abuse ops fail closed until migration — intentional. Login works pre-migration again.
4. **PR base behind `origin/main` by 1 commit** (`3b7fc0dd`) — low risk comment-only; rebase optional before merge.
5. **Captcha** not active unless `TENANT_REGISTER_REQUIRE_HCAPTCHA=1` + secrets — documented, not claimed active.
6. Soft/process memory is non-authoritative for abuse ops; login insert-then-count pre-migration is not perfectly concurrency-safe (documented intentional tradeoff).

## Explicit non-actions

- Did **not** merge, enable auto-merge, or mark ready-for-review.
- Did **not** deploy production.
- Did **not** apply production migration.
- Did **not** suspend/delete/clean production tenants.

## Recommendation

**NOT READY** for independent merge approval until:

1. Required **E2E login** is green on current head, and  
2. Human completes non-prod signup smoke (Resend) from rollout checklist (or explicitly accepts that remaining gap).

After (1)+(2): escalate to **READY FOR INDEPENDENT REVIEW** (still draft until human gates; still no prod migration without separate approval).
