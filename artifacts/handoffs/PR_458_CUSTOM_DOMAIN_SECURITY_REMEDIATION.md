# PR 458 — custom-domain security remediation

Observation timestamp: 2026-10-16T14:19:01Z

Parent head before this change: `093855604d68e8eeebab82ce49105d025ed27eea`
Remediation commit: `447ec0ea771e16609ec676afa95c5add433b3a10`
PR base: `e1248c0b7fc5a08a439e9c3e1c15a3ce175a1a2e`
`origin/main` at review time: `ecf9694ff5b6626539ad0230fee2ca1c3a3d6121`
Branch: `cursor/custom-domain-routing-gate-5594`
PR: https://github.com/Kilchi555/driving-team-app/pull/458 (left as draft)

The remediation commit above contains the code and the first copy of this report. The pull request head is the tip of the branch after push. It was not synchronized onto `ecf9694`. Required checks on `09385560` do not apply to `447ec0ea` or to any later tip.

Production behavior and live TLS remain **NOT VERIFIED**.

## Verdict

`PASS — CODE REMEDIATION COMPLETE; LIVE TLS AND DATABASE POLICY UNVERIFIED`

Safe to merge: **no.** The branch was not synchronized, required checks have not run on this commit, the database trigger is not installed, and custom-host routing stays disabled.

Production behavior verified: **no.**

## What changed

### TLS authority

`hasAuthoritativeTlsEvidence()` in `server/utils/custom-domain.ts` returns false. `hasPositiveTlsEvidence` no longer reads `custom_domain_verification.tls`. `isCustomDomainRoutingEnabled` calls `evaluateCustomDomainRouting` with that false result, so a stored `tls.ok: true` cannot turn routing on.

`vercel.verified` is still only platform ownership evidence inside `hasPositivePlatformEvidence`. It is not treated as a certificate.

No certificate reader and no Vercel TLS or certificate API client exist in this repository. `checkDnsPointsToVercel`, `vercelGetDomain`, and `vercelVerifyDomain` are the only external checks, and `vercelVerifyDomain` is the project-domain verify endpoint. Nothing was invented to fill that gap. Routing stays disabled until a real reader exists.

### Evidence freshness

`hasFreshCheckedAt` rejects a missing `checked_at`, a non-string, a blank string, a value `Date.parse` cannot read, a timestamp in the future of the supplied clock, and an age greater than 60 minutes (`CUSTOM_DOMAIN_EVIDENCE_MAX_AGE_MS`). An age of exactly 60 minutes is fresh. Freshness is required by the routing decision and is not sufficient. `checked_at` does not prove that DNS or TLS is still valid.

`checkDnsPointsToVercel` is called only from `server/api/website/custom-domain/verify.post.ts`. There is no cron or other reconciler. A tenant-triggered verify can store `dns.ok` and a new `checked_at`. That still cannot activate routing, and nothing refreshes the evidence on a schedule. Remaining work, after an authoritative TLS reader exists: re-read DNS and platform state at least every 60 minutes and fail closed when that read does not happen.

### Tenant write paths

`readCustomDomainClaimBody` accepts only `domain`. A body that contains `custom_domain_verification`, `custom_domain_verified`, `custom_domain_status`, `custom_domain_verified_at`, `tls`, or `verification` throws `ClientCustomDomainEvidenceError`. Claim and verify both call it and return HTTP 400. Verify still takes the hostname from the stored row. The staff UI posts `{ domain }` and an empty verify body (`components/admin/WebsiteDomainConnect.vue`).

Claim and verify still build the JSON on the server. They do not copy a client TLS flag. `customDomainActivation` stays `{ verified: false, status: 'dns_pending' }` while the TLS reader is missing.

### Database plan (not applied)

`sql_migrations/20261016_protect_website_custom_domain_evidence.sql` is an unapplied plan. It was not run on staging or production.

The repository has no `GRANT` for `website_tenants`. A column `REVOKE` would not block updates if a table-level `UPDATE` grant exists, which is the usual Supabase Data API default and was not read from the live database. The tenant UI updates `website_status` through the user client (`pages/tenant-admin/websites/[id].vue`), so table-level `UPDATE` was not revoked.

The plan adds `protect_website_custom_domain_evidence()` and a `BEFORE INSERT OR UPDATE` trigger. When `request.jwt.claim.role` is `anon` or `authenticated`, changes to `custom_domain_verification`, `custom_domain_verified`, `custom_domain_status`, and `custom_domain_verified_at` raise `42501`. Other columns on the same row can still change. `users.id` was not rewritten to `auth_user_id`.

`getSupabaseAdmin()` uses `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`. Whether a new `sb_secret_` key sets the JWT role claim was not read. The trigger does not require the claim to equal `service_role`, so a server write with no role claim is not blocked by this function. Tenant Data API sessions carry `authenticated`. Live effect of the trigger is **NOT VERIFIED** because it was not applied.

Until that SQL is applied by a person, a staff or admin session that matches the existing policy `"Users can update their own website tenant"` (`migrations/001_create_website_tables.sql`) may still be able to write those columns. Whether production rows satisfy `users.id = auth.uid()` was not read. Those writes cannot activate routing, because the predicate ignores `tls.ok` and `custom_domain_verified`.

### URL builders

These callers now use `customDomainOrigin`, which follows the closed predicate, instead of `custom_domain_verified && custom_domain`:

- `server/utils/website-billing.ts`
- `server/utils/website-ensure-home.ts`
- `server/utils/website-ensure-seo-pages.ts`
- `server/api/website/wizard-save.post.ts`
- `server/api/website/slots-save.post.ts`
- `server/api/website/addon/generate.post.ts`
- `server/api/admin/billing-status.get.ts`

No separate PR is required for that switch. They do not emit a custom origin while routing is disabled. Several of them do not select `custom_domain_verification`. After a future TLS reader exists, those selects must include the evidence columns or they will keep using the platform URL.

`server/utils/website-seo-context.ts` and the public website routes already called the predicate. They stay closed with it.

### Lookup errors

`customDomainLookupFromQuery` maps any Supabase error to `{ ok: false, reason: 'error' }` and does not return the row. `decideCustomDomainRoute` then returns `not_found`. The middleware throws HTTP 404. There is no allow cache (`CACHE_MS` and `new Map` stay absent).

## Tests

Command:

`npx vitest run server/utils/__tests__/custom-domain-routing-gate.test.ts server/utils/__tests__/custom-domain-app-host.test.ts`

Result at 2026-10-16T14:19:01Z: 2 files, 24 tests, all passed.

Command:

`npx eslint server/utils/__tests__/custom-domain-routing-gate.test.ts server/utils/__tests__/custom-domain-app-host.test.ts --max-warnings 0`

Result: exit 0.

Covered on this run:

- Client `tls.ok: true` with fresh platform and DNS evidence does not enable routing, origin, activation, or a rewrite.
- Claim-body helper rejects verification fields and `tls`. Claim and verify source call `readCustomDomainClaimBody` and do not contain `tls: {`.
- Missing, blank, invalid, future, and older-than-60-minute `checked_at` fail `hasFreshCheckedAt`, `isCustomDomainRoutingEnabled`, and `evaluateCustomDomainRouting` even when the test passes `true` for the TLS argument.
- A fresh timestamp alone does not enable routing.
- A database error becomes `reason: 'error'` and `not_found`, including a second call after an earlier row. The middleware source throws `statusCode: 404` and has no `Map`.
- `app.simy.ch/s/fahrschule-sara` and `app.simy.ch/s/tenant-b` stay `app`.
- Unknown host `/s/tenant-b` is `not_found`.

`evaluateCustomDomainRouting(..., true)` is a test double. It is not a certificate check and it is not what production calls. Production calls `hasAuthoritativeTlsEvidence()`, which returns false.

### Typecheck

`npx nuxi typecheck` failed before checking the project: `Expected double-quoted property name in JSON at position 168 (line 8 column 3)` from the trailing comma in `tsconfig.json`. That file was not edited.

`npx nuxt prepare` completed and wrote `.nuxt` types.

`NODE_OPTIONS=--max-old-space-size=6144 npx vue-tsc --noEmit --pretty false --incremental false` aborted with exit 134, JavaScript heap out of memory. No type errors were printed. Project typecheck is **NOT VERIFIED**.

ESLint on the API and util files outside `server/utils/__tests__` reports existing `no-explicit-any` findings. CI lint is the test-file command above, which passed. Those `any` findings were not introduced as the remediation.

## Remaining work

- Authoritative TLS reader: missing. Do not treat `tls.ok` or `vercel.verified` as that reader.
- Scheduled DNS and platform re-check inside 60 minutes: missing. Verify-on-demand is the only DNS write.
- Apply `sql_migrations/20261016_protect_website_custom_domain_evidence.sql` only through the human database gate. It is not applied.
- Synchronize onto current `main` in a later task, then read Test and lint, E2E login, and Dependency review on the new head. The greens on `09385560` do not apply to this commit.
- `GET /api/website/custom-domain` still returns the stored verification object to the signed-in tenant admin. That is a read. It does not activate routing.
- `x-forwarded-host` is still preferred over `host`. That was not changed.

No dependent pull request is required for the URL-builder change.

Production behavior and live TLS remain **NOT VERIFIED**.
