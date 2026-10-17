# Fahrschule Sara — custom domain launch

Verdict: **CONDITIONAL PASS**

Observation timestamp: 2026-10-17T05:30:00Z

The application can route a custom hostname after a live certificate check succeeds. `fahrschule-sara.ch` is not on that path yet. This handoff does not authorize a merge, undraft, deployment, DNS change, or production write.

## 1. Git

| Item | Value |
| --- | --- |
| PR | [#458](https://github.com/Kilchi555/driving-team-app/pull/458), OPEN, draft |
| Branch | `cursor/custom-domain-routing-gate-5594` |
| Code commit | `176aa29241855a7575c85e6e73e064ae217610d0` |
| Parent | `bae45277b013127fbfa201f70cd077ccf6bf0afd` |
| Base and `origin/main` | `ecf9694ff5b6626539ad0230fee2ca1c3a3d6121` |
| Main is an ancestor of the code commit | Yes |

Required checks on `bae45277` were green (Test and lint, E2E login, Dependency review). They do not cover `176aa292`. `App | Default` is not a ruleset check. The branch tip needs its own required runs. A later handoff-only commit may sit on top of `176aa292`; that tip is the PR head.

The unstaged edit in `artifacts/handoffs/PR_458_SYNC_AND_REVALIDATION.md` and the other untracked handoffs were not staged.

## 2. What is live

Re-read 2026-10-17, read-only:

| Check | Result |
| --- | --- |
| `https://app.simy.ch/api/public/website/fahrschule-sara` | HTTP 200. `is_published` true, `custom_domain` null, `custom_domain_verified` false. |
| `fahrschule-sara.ch` NS | `ns6.wixdns.net`, `ns7.wixdns.net` |
| `fahrschule-sara.ch` A | `185.230.63.186`, `185.230.63.107`, `185.230.63.171` |
| `www.fahrschule-sara.ch` CNAME | `cdn3.wixdns.net` |
| MX | Google: `aspmx.l.google.com` priority 10, `alt1` 20, `alt2` 30, `alt3` 40, `alt4` 50 |

Earlier the same day, the platform site, impressum, datenschutz, sitemap, and robots returned HTTP 200 on `https://app.simy.ch/s/fahrschule-sara`. The public Wix host still served `WEBSITE IM AUFBAU` with a Let’s Encrypt certificate that is not a SIMY certificate. Those page bodies were not fetched again in this pass. No domain was claimed. No DNS record was written.

## 3. Files changed and why

| File | Why |
| --- | --- |
| `server/utils/custom-domain-tls.ts` | New bounded handshake. One IPv4 lookup, one port-443 connection, SAN and chain and dates checked, fail closed. |
| `server/utils/custom-domain.ts` | Async gate calls that handshake only after publication, DNS, Vercel configuration, and freshness already passed. `hasAuthoritativeTlsEvidence()` with no argument stays false. DNS example constants were not replaced. |
| `server/middleware/02.custom-domain.ts` | Awaits the route decision. App hosts still return before lookup. |
| `server/api/website/custom-domain.post.ts` and `verify.post.ts` | Await activation. They still do not store `tls.ok`. |
| SEO, billing, wizard, public website callers | Await the origin so a Promise cannot become a URL. Billing status loads the verification columns it needs. |
| `server/utils/__tests__/custom-domain-tls.test.ts` | Certificate, timeout, DNS, private-address, and unregistered-host cases. |
| `server/utils/__tests__/custom-domain-routing-gate.test.ts` | Fail-closed cases stay off. A valid injected certificate enables one tenant. |

`server/routes/s/[subdomain]/llms.txt.ts` no longer calls the SEO resolver and then ignores the result. That call would have opened a second handshake.

## 4. Security design

Routing for a non-app host turns on only when all of these are true:

1. The host is not a platform host (`app.simy.ch`, `*.simy.ch`, `*.vercel.app`, localhost, an IP, or a preview suffix).
2. The database lookup for that exact `custom_domain` returns one row. `maybeSingle` plus an error result is HTTP 404. A conflict is HTTP 404.
3. The request host normalizes to that row’s `custom_domain`.
4. The site is published, stored DNS evidence is strictly `true`, stored Vercel `configured` and `verified` are strictly `true` with no error, and `checked_at` is within 60 minutes and not in the future.
5. A live handshake to the row’s hostname succeeds.

The handshake:

- Runs only for a hostname already stored on that row, and only after the gates above pass. Any other name returns `unregistered` before DNS.
- Resolves IPv4 only, at most 8 addresses, with a 2.5 second timeout.
- Refuses the whole answer if any address is loopback, private, link-local, CGNAT, documentation, multicast, or not IPv4. It then does not connect.
- Connects to the first remaining address with `host` set to that IP, `servername` set to the hostname, and port 443. There is no HTTP request and no redirect.
- Requires `rejectUnauthorized` and `checkServerIdentity` against the certificate SANs. A wildcard does not match the apex.
- Requires the certificate’s not-before/not-after window to contain the same clock used for freshness.
- Fails closed on DNS errors, timeouts, chain failures, mismatch, and expiry.
- Is not cached. A later request checks again.

Stored `tls.ok`, a client body, and `vercel.verified` are not certificates. `evaluateCustomDomainRouting(..., true)` remains a test double for the non-TLS gates only.

Client claim bodies that include verification fields are rejected. The unapplied SQL file `sql_migrations/20261016_protect_website_custom_domain_evidence.sql` was not applied and was not changed.

### Remaining limitations

- IPv6-only names fail closed because the reader uses `resolve4`.
- Each gated call does at most one lookup and one connection. One HTTP request can call the gate more than once (middleware, then the page or SEO handler). There is no cross-request cache.
- `dnsInstructions()` still returns `76.76.21.21` and `cname.vercel-dns.com`. Those values were not confirmed on the `simy-app` domain screen. Comments in the source now say they are generic examples. `checkDnsPointsToVercel` still treats a CNAME ending in `.vercel-dns.com` or that example A address as DNS evidence. That evidence is necessary and not a certificate.
- The Vercel dashboard was not readable from this environment, so the real DNS target is unknown.
- Sara’s hostname is not stored, DNS still points at Wix, and no SIMY certificate was observed for it. The code path is ready. The domain is not.

## 5. Tests

Local, 2026-10-17, exit 0:

```text
npx vitest run \
  server/utils/__tests__/custom-domain-tls.test.ts \
  server/utils/__tests__/custom-domain-routing-gate.test.ts \
  server/utils/__tests__/custom-domain-app-host.test.ts
```

3 files, 35 tests passed.

```text
npx eslint \
  server/utils/__tests__/custom-domain-tls.test.ts \
  server/utils/__tests__/custom-domain-routing-gate.test.ts \
  --max-warnings 0
```

Exit 0. The repository lint script is eslint on `server/utils/__tests__/**/*.ts` only.

Covered:

- Valid SAN, including a single-label wildcard for `www` and not for the apex.
- Missing, unauthorized, mismatched, expired, not-yet-valid, and undated certificates.
- DNS failure, empty answers, more than 8 addresses, DNS timeout, TLS timeout, connection error.
- Private and mixed answers do not connect. A direct connect to a metadata address is refused.
- Unregistered names, platform names, and IP literals do not resolve.
- Duplicate or conflicting lookup, database error, unknown host, and a host header that does not match the stored domain stay `not_found`.
- `app.simy.ch` stays on the app route and does not probe.
- Origin stays null until the handshake succeeds, then becomes `https://` plus the stored hostname. Public payloads omit verification JSON.
- A fresh timestamp or `tls.ok` in JSON does not activate routing when the handshake fails.

Not run: a repository-wide `nuxi typecheck`. The previous audit on `bae45277` versus `ecf9694` found 4,723 diagnostics on both, of which 4,721 matched and 2 new `getRequestHeader` diagnostics were in `server/routes/robots.txt.ts`. This change does not edit that file and does not clean up the baseline.

Not done: a browser pass, a real handshake to `fahrschule-sara.ch` as a SIMY hostname, or a production request through the new middleware.

## 6. Human DNS and Vercel actions

No registrar, Wix, or Vercel dashboard session was available. The targets below are human-required. Do not treat a source constant as a confirmed record.

1. Open the Vercel project **simy-app** (the project that serves `app.simy.ch` and the root Nuxt app). Do not add the domain to `simy-website` or `driving-team-website`.
2. Add `fahrschule-sara.ch` and `www.fahrschule-sara.ch` in that project’s domain screen.
3. Copy the DNS records and targets that this screen shows. If it shows a different A or CNAME than `76.76.21.21` or `cname.vercel-dns.com`, use the screen. If it shows those values, they are confirmed only because the screen showed them.
4. At the DNS host (currently Wix nameservers), change only the web records the screen names. Keep the Google MX records, the SPF TXT, the Google site-verification TXT, and any DKIM record, including selectors not listed in section 2.
5. Wait until Vercel reports the hostname verified and a certificate is issued for that exact name. Ownership verification alone is not the certificate.
6. In SIMY, claim the domain for the Fahrschule Sara tenant only, then run the in-app verify action. Activation stays off until the live handshake succeeds for that stored hostname. Do not set verification JSON by hand.
7. Test apex and `www` with a browser GET. The HTML title must be the SIMY title `Fahrschule Reinach BL | FAHRSCHULE Sara`. The certificate must name that host. Check impressum, datenschutz, one asset, robots, and sitemap. Canonical and sitemap URLs should use the custom origin only after that success. Do not submit a booking.
8. Decide which host is canonical. Wix currently redirects the apex to `www`. SIMY does not add a second redirect in this change. The certificate and the stored `custom_domain` must be the host that should serve the site. Add the other host only if the Vercel screen requires it for the redirect you want.

Ask Sara whether a UID and a Handelsregister number must appear. They were absent from the platform impressum. Do not invent them.

## 7. Rollback

If the cutover is wrong, restore the web records from section 2: apex A to `185.230.63.186`, `185.230.63.107`, and `185.230.63.171`, and `www` CNAME to `cdn3.wixdns.net`. Leave MX, SPF, site-verification, and DKIM in place. After those records answer again, remove the hostnames from the simy-app project. Clear the tenant `custom_domain` from the product UI if it was saved. This change did not alter DNS or the tenant row, so there is nothing to roll back until a human does those steps.

## 8. Prohibited actions not taken

No merge, approval, undraft, deploy, or workflow dispatch. No DNS, registrar, Wix, or Vercel dashboard change. No domain claim or activation. No production or staging database write. No migration applied. No production environment variable change. No booking, email, or SMS. The unrelated dirty handoff files were not overwritten or committed. Wix was not removed or replaced.
