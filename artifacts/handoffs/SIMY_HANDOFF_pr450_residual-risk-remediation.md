# SIMY — Agent Handoff

## 1. Summary

- Status: **READY FOR HUMAN REVIEW** (draft PR remains draft; no undraft/merge)
- Task: Finalize four residual-risk remediations on Draft PR #450 using confirmed product decisions
- What was accomplished: Implemented stable preview tokens, orphan media cleanup on failed create, explicit VAT selection (no silent 8.1% for `generic`), and executable `finishProspectSite` integration tests; updated human-acceptance handoff
- Next action: Human reviews this remediation + draft PR tip CI; separate undraft/merge authorization still required
- Human approval required: **YES** (undraft/merge)

### Confirmed product decisions (applied)

1. Reuse existing media-compression pipeline (`normalizeWebsiteMedia`) — no duplicate compression
2. Keep preview tokens stable across regeneration while valid/safe; rotate only when necessary (`forceRotate`)
3. Authoritative existing VAT when available; otherwise explicit customer selection persisted on `analysis.vat_selection` — no silent 8.1% for ambiguous `generic`
4. Executable integration coverage for `finishProspectSite`

---

## 2. Git State

- Observed at (UTC): **2026-10-16T12:07:28Z** (pre-commit working tree; tip SHA updated after push — see Verification)
- Repository: Kilchi555/driving-team-app
- Pull request: https://github.com/Kilchi555/driving-team-app/pull/450
- State at start of work: **OPEN · DRAFT**
- Branch: `cursor/prospect-preview-token-facts-e5ac`
- Prior HEAD (verified match before edit): `468800b2d83628add087bb6890d171a307f631fe`
- Prior Base (PR base OID at start): `a75e065eed1ed7143b0e49718976b9b0209979bd`
- `origin/main` at start of work: `57543d57dd27b9ceabd84894cc74a1123fdb45dd` (ahead of PR base; branch not rebased by this agent)
- Unexpected branch drift: **NONE** — tip matched live PR HEAD before edits

---

## 3. Changes

### Files changed

| File | Role |
|------|------|
| `server/utils/website-preview-access.ts` | `extractPreviewTokenFromUrl`, `ensureWebsitePreviewToken` (reuse vs mint) |
| `server/utils/website-prospect-media.ts` | Track `uploaded_paths`; `removeProspectUploadedPaths` / path allowlist |
| `server/utils/website-prospect-vat.ts` | **New** — allowlist + `resolveProspectVatRate` + analysis merge |
| `server/utils/website-prospect-generate.ts` | Stable token, VAT gate, orphan rollback, export `finishProspectSite` |
| `server/utils/website-prospect-types.ts` | `vat_selection` on `ProspectAnalysis` |
| `server/api/tenant-admin/website-prospects/[id]/generate.post.ts` | Accept `vat_rate_percent` / force rotate |
| `server/api/tenant-admin/website-prospects/[id].patch.ts` | Persist `vat_rate_percent` → `analysis.vat_selection` |
| `pages/tenant-admin/websites/prospects/[id].vue` | MwSt selector + generate wiring |
| `server/utils/__tests__/website-prospect-finish-integration.test.ts` | **New** integration suite |
| `server/utils/__tests__/website-prospect-vat.test.ts` | **New** VAT unit tests |
| `server/utils/__tests__/website-prospect-landing-facts.test.ts` | Ensure-token reuse assertions |
| `server/utils/__tests__/website-prospect-media-cron.test.ts` | Cleanup allowlist unit |
| `artifacts/handoffs/SIMY_HANDOFF_pr450_human_risk_acceptance.md` | Updated post-remediation |
| `artifacts/handoffs/SIMY_HANDOFF_pr450_residual-risk-remediation.md` | This file |
| `artifacts/handoffs/SIMY_HANDOFF_pr450_residual_risk_gate.md` | Prior gate (committed for trail) |

### Behavior notes

**Compression (reused, not duplicated)**

- Path: fetch → size gate (`IMAGE_MIN_BYTES` / `PROSPECT_IMAGE_MAX_BYTES`) → `normalizeWebsiteMedia(slot)` (sharp resize + WebP under slot budgets: logo 120KB, hero 420KB, service 180KB) → upload `tenant-logos` as `{tenantId}/website/prospect-{slot}-{hash}.webp`
- Formats: jpeg/png/webp/gif/heic/heif/avif inputs via sharp; output WebP

**Orphan cleanup**

- On **created** shell failures after upload (token mint fail, page insert fail, prospect persist fail): delete allowlisted `uploaded_paths`, then delete `website_tenants` + `tenants`
- Never deletes blobs on regenerate (`created: false`) when shell remains
- Path allowlist: `{tenantId}/website/prospect-*.webp` only; never deletes unrelated or cross-tenant paths
- Failed completion never sets `is_published: true`; finish also clears accidental published flag

**Preview token lifecycle**

- Stable: `ensureWebsitePreviewToken` reuses raw token from `prospect.preview_url` when hash+expiry still valid
- Rotate: `force_rotate_preview_token` / `forceRotatePreviewToken`, or missing/expired/mismatched token
- Published sites still public without token; unpublished still fail-closed without valid token
- Entropy/TTL/hashing unchanged (`issueWebsitePreviewToken` still the mint primitive)

**VAT**

- Source order: existing tenant `default_vat_rate` (allowed) → explicit `analysis.vat_selection` / request → education types → **400 selection required**
- Allowed: `0 | 2.6 | 3.8 | 8.1`
- Persisted on prospect JSONB `analysis.vat_selection` — **no schema migration**
- UI disclaimer: not tax advice / not legal confirmation
- Does not rewrite an already-authoritative tenant rate

### Impact / authz note

Preview-token ensure and privileged admin Supabase usage sit on an elevated path; changes are narrowly scoped remediations on the existing draft PR generate path (no new public auth surface, no RLS/migration, no production writes).

---

## 4. Verification

### Commands and results

```text
npx vitest run \
  server/utils/__tests__/website-prospect-vat.test.ts \
  server/utils/__tests__/website-prospect-landing-facts.test.ts \
  server/utils/__tests__/website-prospect-finish-integration.test.ts \
  server/utils/__tests__/website-prospect-media-cron.test.ts \
  server/utils/__tests__/website-public-security.test.ts
→ 5 files / 36 tests PASSED

npm run lint
→ eslint server/utils/__tests__/**/*.ts — PASSED (max-warnings 0)
```

### Integration vs unit / mocks

| Suite | Kind | Mocked boundaries |
|-------|------|-------------------|
| `website-prospect-finish-integration.test.ts` | **Integration** of `finishProspectSite` orchestration | `ingestProspectMedia`, `fillProspectSectionPhotos`, `applyProspectArchitecture`, `getAppUrl`, landing/email builders; injectable memory Supabase |
| `website-prospect-vat.test.ts` | Unit | none |
| `website-prospect-landing-facts.test.ts` | Unit + token gate | memory Supabase |
| `website-prospect-media-cron.test.ts` | Unit (incl. cleanup allowlist) | place/ssrf/storage/normalize |
| `website-public-security.test.ts` | Unit (authz gate) | memory Supabase |

**Not run here:** live Supabase storage, Unsplash, Google Places, full Nuxt E2E generate UI, production migrations.

### Coverage mapped to requirements

- Successful completion ✔
- Compression reused via ingest ✔ (asserted call boundary; sharp path unchanged)
- Upload failure soft-null inside ingest (pre-existing); token fail after upload ✔ cleanup
- Token creation failure after upload ✔
- Persistence failure + rollback ✔
- Stable token across regen + deliberate invalidation ✔
- Missing/ambiguous VAT + persistence of selection ✔
- Tenant path isolation + no accidental publish after failure ✔

---

## 5. Risks / unresolved

| Item | Status |
|------|--------|
| PR base behind `origin/main` (`a75e065e` vs `57543d57`) | Unresolved — human/rebase decision; agent did not rebase |
| Leftover shell delete at generate start still does not purge storage for prior leftovers | Narrow residual; new failures on **created** path clean ingest paths |
| Regenerate (`created: false`) failure does not remove newly uploaded paths that may overwrite via upsert hash | Acceptable residual; website row remains and may reference URLs |
| Historical shells already created with silent 8.1% keep that rate as `tenant_existing` | By design (authoritative existing) |
| Tax correctness of chosen rates | Explicitly **not** confirmed by product UI; human/tax responsibility |
| Required CI on new tip | Pending after push |

---

## 6. External Actions and Production Safety

- Commit / push to draft PR branch: **YES** (after this handoff)
- PR undraft / approve / merge: **NO**
- Deployment / workflow dispatch: **NO**
- Production DB changes / migrations: **NO**
- Manual production writes: **NO**

---

## 7. Next Step

- Exact recommended next action: Human reviews remediation + waits for required checks on new tip (`Test and lint`, `E2E login`, `Dependency review`). Keep draft until separate undraft/merge authorization.
- Do **not** treat this handoff as merge authority.
