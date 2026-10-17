# SIMY — Agent Handoff

## 1. Summary

- Status: **CONDITIONAL PASS**
- Task: Residual-risk review & merge gate for Draft PR #450 (four Medium risks)
- What was accomplished: Re-verified live GitHub state; assessed media/token, token rotation, `generic` VAT, and `finishProspectSite` test coverage with code evidence only; wrote this handoff.
- Next action: Human consciously accepts residual risks (esp. ops token rotation + VAT default for unknown-type shells), then **separately** undrafts/merges #450. This review does **not** authorize undraft/merge.
- Human approval required: **YES**

### Gesamturteil

**CONDITIONAL PASS — HUMAN DECISION REQUIRED**

Technisch vertretbar und required CI grün auf dem Tip-SHA. Kein ungeklärter Critical/High-Security-Blocker. Mindestens bewusste Produkt-/Betriebsentscheidungen zu VAT-Default und Token-Rotation/Orphan-Media bleiben.

---

## 2. Git State

- Observed at (UTC): **2026-10-16T06:35:11Z**
- Repository: Kilchi555/driving-team-app
- Pull request: https://github.com/Kilchi555/driving-team-app/pull/450
- State: **OPEN · DRAFT** (`isDraft: true`)
- Branch: `cursor/prospect-preview-token-facts-e5ac`
- HEAD SHA: `468800b2d83628add087bb6890d171a307f631fe`
- Base SHA: `a75e065eed1ed7143b0e49718976b9b0209979bd`
- Implementation SHA (ancestor): `37f8a36b6e834f193754bf3c1b0bc6bfbd87cf42`
- mergeable: MERGEABLE · mergeStateStatus: **UNSTABLE** (App Store status; not a ruleset gate)
- Working tree for this review: handoff file only may be written; **no commit/push** performed
- New commits since prior independent review: **none** (still 4 commits; tip unchanged)
- Tip vs implementation delta: **docs-only** (`artifacts/handoffs/*`); application code identical

### Required checks (live ruleset `Protect main — Required CI`)

Verified via GitHub ruleset API + commit check-runs on tip `468800b2`:

| Check | Status | Bound SHA | Merge gate? |
|-------|--------|-----------|-------------|
| Test and lint | **SUCCESS** | `468800b2…` | **YES** |
| E2E login | **SUCCESS** | `468800b2…` | **YES** |
| Dependency review | **SUCCESS** | `468800b2…` | **YES** |
| App \| Default | FAILURE | tip | **NO** (ship-to-main) |
| App \| Default \| Archive - iOS | ACTION_REQUIRED | tip | **NO** |
| CodeQL / Vercel | SUCCESS | tip | **NO** |

`strict_required_status_checks_policy: true` — branch must be up to date with base (currently base = tip’s merge-base; no new main commits observed in this fetch beyond known base).

---

## 3. Changes

- Application/PR code: **not modified** by this review
- Handoff artifact written: `artifacts/handoffs/SIMY_HANDOFF_pr450_residual_risk_gate.md`
- Requested work not completed: undraft/merge (forbidden)

---

## 4. Verification (risk gates)

### Gate 2 — Medien-Ingestion / Token — **ACCEPTABLE WITH KNOWN RISK**

**Code evidence**

1. Yes: `ingestProspectMedia` → `storage.from('tenant-logos').upload` + `getPublicUrl` runs **before** `issueWebsitePreviewToken` in `finishProspectSite` (`website-prospect-generate.ts` ~219–261; `website-prospect-media.ts` ~49–68, 103–120).
2. On mint failure (`issued == null`): for `created` shells, deletes `website_tenants` + `tenants` rows; **no** storage delete. Throws 503. For regenerate (`created: false`), throws without changing old hash (mint never wrote).
3. Cleanup/retry/resume for storage: **not present** in this path.
4. Public **HTML/site** reachability: generate always sets `is_published: false` (website + home page). Public handler requires `authorizePublicWebsiteRead`; without token → 404 (`[subdomain].get.ts`). After mint-fail rollback, website row is gone → 404. **Orphaned public image blobs** can remain under `{tenantId}/website/prospect-*.webp` if URL is known — not a browsable unpublished site.
5. Reproducibility: only when `issueWebsitePreviewToken` returns null (DB update error / missing update API). No live failure reproduced; **theoretical/rare**, code path is real.

**Tests:** unit coverage for mint null / authorize fail-closed; **no** test asserting storage cleanup.

### Gate 3 — Token-Rotation — **ACCEPTABLE WITH KNOWN RISK**

**Code evidence**

- Generate/store: random 32-byte base64url; persist **sha256 hash** + 7d expiry on `website_tenants`; URL via `previewUrlForPath` → `?preview_token=` (`website-preview-access.ts`).
- Validate: timing-safe hash match + expiry; missing/invalid/expired/`?preview=1` alone → deny (`authorizePublicWebsiteRead`).
- Rotation: each `issueWebsitePreviewToken` overwrites hash — same as `/api/website/preview-link`, wizard-save, slots-save, addon generate. Prospect regenerate intentionally invalidates prior raw URLs (comment in generate).
- Exposure: raw token in returned/stored `preview_url` and email draft (intentional delivery channel). No `console.log` of token in generate/access helpers. Hash column never stores raw token.
- Gate: unchanged vs #299; published sites still public without token.

**User-facing regression:** prior shared/emailed preview links die after regenerate — **ops expectation**, not a security bypass.

**Tests:** rotation + expired + invalid covered in `website-prospect-landing-facts.test.ts` and `website-public-security.test.ts`.

### Gate 4 — `generic` VAT 8.1% — **ACCEPTABLE WITH KNOWN RISK** (human product/tax ack)

**Code evidence**

- Source: `defaultVatRateForBusinessType` — education types (incl. `driving_school`) → **0**; else → **8.1** (`invoice-vat.ts`).
- Applied automatically on prospect tenant **insert** as `default_vat_rate` (`website-prospect-generate.ts`).
- Same helper used by `server/api/tenants/register.post.ts` for normal registration — **generic already implies 8.1%** elsewhere.
- Billing effect: used when drafting invoices / receipts / accounting VAT paths that read `tenants.default_vat_rate`.
- Editable: admin invoice settings UI `pages/admin/profile.vue` (`default_vat_rate` number field) via `save-settings` — after claim/login as admin, **before** typical invoice use.
- Tax law correctness for all “Anderes” verticals: **not verified** from repo; no legal confirmation invented.

**Human decision:** Accept that unknown-category prospect shells get the same `generic` VAT default as registrierte “Anderes”-Tenants (8.1%), instead of the previous fabricated `driving_school` (0%).

### Gate 5 — `finishProspectSite` Integrationstest — **ACCEPTABLE WITH KNOWN RISK**

**Critical transitions:** media ingest → DB logo/hero update → token mint → landing build → `website_pages` insert/update (`is_published: false`) → architecture addons → prospect `preview_url`/status update.

**Failure modes:** mint fail (rollback rows); page insert fail (rollback rows if created); media upload soft-fails to null URLs inside ingest (no throw).

**Coverage:** strong on fact helpers + token authorize/rotation; **no** end-to-end `finishProspectSite`/`generateWebsiteProspectSite` mock integration. Source-string assert that generate calls mint helpers.

**Impact of gap:** Unlikely accidental **publish** (flags hard-coded false + public gate). Residual risk is incomplete rollback (storage orphans) already rated above — not silent public release. Full local integration test would be possible with mocked Supabase/storage; **not run** here.

---

## 5. Risks table

| Risiko | Code-Evidenz | Bestehende Tests | Auswirkung | Einstufung |
|--------|--------------|------------------|------------|------------|
| Medien-Ingestion / Token-Fehler | Ingest+public upload before mint; DB rollback without storage delete; site stays unpublished / rolled back | Mint-null + authorize unit tests; no storage cleanup test | Orphan public blobs; **no** public HTML site without token | **ACCEPTABLE WITH KNOWN RISK** |
| Token-Rotation | Overwrite hash on each mint; same as preview-link callers; fail-closed validation | Rotation/expiry/invalid unit tests | Old preview links die after regenerate | **ACCEPTABLE WITH KNOWN RISK** |
| `generic` VAT 8.1 % | `defaultVatRateForBusinessType`; same as register; editable in admin profile | VAT util tests exist elsewhere; no prospect-specific VAT e2e | Default rate on unknown-type shells; invoices later use it unless changed | **ACCEPTABLE WITH KNOWN RISK** (+ human ack) |
| `finishProspectSite` Integrationstest | Full path visible in generate; publish flags false | Helpers/token covered; no full generate integration | Gap does not by itself enable public leak | **ACCEPTABLE WITH KNOWN RISK** |

---

## 6. External Actions and Production Safety

- Commit created: **NO**
- Remote push: **NO**
- Pull request created or updated: **NO**
- Undraft / approve / merge: **NO**
- Deployment / workflow dispatch: **NO**
- Production database changes / migrations: **NO**
- Live uploads / token mint / tenant create: **NO**
- Other externally visible side effects: **NO** (handoff file local only until a human commits it)

---

## 7. Next Step

- Exact recommended next action: Human confirms acceptance of (1) orphaned-media residual, (2) preview-link invalidation on regenerate, (3) `generic`→8.1% VAT default aligning with registration. Then **separate explicit authorization** to undraft and merge #450 while required checks remain green on the merge tip.
- Required human decision: Produkt/Steuer-Ack für VAT; Betriebs-Ack für Token-Rotation; Merge-Freigabe.
- If blocked: not blocked on Critical security; remains **draft** until human undrafts.

### Bereit für menschliche Merge-Entscheidung?

**Ja, mit Bedingungen (CONDITIONAL PASS):** required CI green; residual risks rated acceptable with known risk; **PR #450 remains draft and must not be undrafted/merged by agents without separate human authorization.**
