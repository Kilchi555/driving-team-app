# SIMY — PR 1: Fail-closed custom-domain routing gate

Draft only. No migration, production write, DNS change, Vercel change, TLS change, cache purge, deploy, or merge. `fahrschule-sara.ch` was not modified and stays on Wix. No existing domain was activated.

## Verdict

**PASS**

Public custom-host routing stays off unless platform, DNS, and TLS evidence are all boolean `true`, and the site is published. This PR does not write TLS evidence, so claim and verify cannot mark a domain `verified` or `active`.

## Changed files

| File | Behavior |
| --- | --- |
| `server/utils/custom-domain.ts` | Shared predicate, origin helper, activation decision, public payload strip, host decision. No allow-cache. |
| `server/middleware/02.custom-domain.ts` | Non-app hosts 404 unless the predicate allows that exact row. `/s/{other-tenant}`, `/admin`, `/booking`, and `/api` do not fall through. App hosts return immediately. |
| `server/utils/website-seo-context.ts` | Custom host resolves a tenant only through the predicate. A query or path subdomain cannot select a different tenant. Canonical base uses the custom origin only when the predicate is true. |
| `server/routes/robots.txt.ts` | Custom host with no enabled tenant returns 404, not the platform robots file. |
| `server/routes/sitemap.xml.ts` | Unchanged control flow. A failed custom-host context already 404s. |
| `server/routes/s/[subdomain]/sitemap.xml.ts`, `robots.txt.ts`, `llms.txt.ts` | Locs stay on `app.simy.ch/s/{subdomain}` until the predicate allows the custom origin. |
| `server/routes/llms.txt.ts` | Uses the SEO context, so a closed custom host 404s. |
| `server/api/public/website/[subdomain].get.ts` and `[slug].get.ts` | `siteUrl` and `custom_domain_routing_enabled` come from the predicate. Stored verification JSON is not returned. |
| `pages/s/[subdomain]/index.vue`, `[slug].vue` | 301 and canonical run only when `custom_domain_routing_enabled === true`. |
| `server/api/website/custom-domain.post.ts` | Saves the hostname and records whether the Vercel call was configured. Does not check DNS or TLS. Activation stays `dns_pending` / not verified. |
| `server/api/website/custom-domain/verify.post.ts` | Stores DNS `ok` and Vercel `configured`/`verified` booleans. Does not store a TLS pass and does not keep a previous `verified_at` when activation is false. |
| `server/utils/__tests__/custom-domain-routing-gate.test.ts` | Regression matrix below. |

## Evidence for each condition

| Condition | Positive proof the predicate accepts | What does not count |
| --- | --- | --- |
| Published | `is_published === true` | A domain row alone |
| Platform | `custom_domain_verification.vercel.configured === true` and `vercel.verified === true`, and no `vercel.error` | `custom_domain_verified`, status `active`, a DNS match, `configured: false` (missing API), or an error string |
| DNS | `custom_domain_verification.dns.ok === true` | CNAME or A records by themselves, including `76.76.21.21` |
| TLS | `custom_domain_verification.tls.ok === true` | Anything else. There is no TLS column. This PR never writes `tls`. Missing JSON is fail-closed, not a success. |

`customDomainActivation` calls the same predicate. Claim never has DNS or TLS in the object it saves. Verify can store DNS and Vercel booleans, and still cannot activate without `tls.ok === true`.

## Tests

`npx vitest run server/utils/__tests__/custom-domain-routing-gate.test.ts server/utils/__tests__/custom-domain-app-host.test.ts`

2 files, 19 tests, all passed.

`npx eslint server/utils/__tests__/custom-domain-routing-gate.test.ts --max-warnings 0` passed.

Covered:

- DNS match with Vercel `configured: false`
- Vercel error / missing project association
- TLS missing and `tls.ok: false`
- `custom_domain_verified: true` and status `active` with incomplete evidence
- A fresh missing lookup after an allow does not rewrite (no allow-cache; middleware source has no `CACHE_MS` or `new Map`)
- Unknown host path `/s/tenant-b` is `not_found`
- `app.simy.ch/s/{tenant}` is `app`
- Sitemap/robots base stays on the path host until the predicate is true
- Conflict lookup has no subdomain
- Claim and verify sources call `customDomainActivation`, do not write `tls`, and do not contain `vercelApiMissing`

## Standard-host compatibility

The decision function returns `app` for `app.simy.ch` before any custom-domain lookup, including `/s/fahrschule-sara`. `isAppHost` still treats `app.simy.ch`, `www.app.simy.ch`, `simy.ch`, `www.simy.ch`, `*.vercel.app`, localhost, and tunnel hosts as the app.

This environment did not boot the Nitro server, so the compatibility result is the unit test, not a live request. Production was not deployed, so `https://app.simy.ch/s/fahrschule-sara` is unchanged.

## Remaining fail-closed limitations

- Routing cannot turn on until a later change performs a real TLS check and stores `tls.ok` only when that check passes. This PR does not add that check and does not add a column.
- `x-forwarded-host` is still preferred over `host`. Whether Vercel overwrites it was not tested.
- These builders still read `custom_domain_verified` when composing a URL: `website-billing.ts`, `website-ensure-home.ts`, `website-ensure-seo-pages.ts`, `billing-status.get.ts`, `wizard-save.post.ts`, `slots-save.post.ts`, `addon/generate.post.ts`. Claim and verify no longer set that flag. They are not the host router.
- Authenticated `GET /api/website/custom-domain` still returns the stored verification object to the tenant admin.
- No role check, rate limit, or audit log was added.
- No shared-cache purge. The in-process allow-cache is gone. Public HTML on the app host still uses the existing `s-maxage`.

## Verdict

**PASS**
