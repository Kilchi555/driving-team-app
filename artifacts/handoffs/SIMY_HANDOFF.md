# SIMY — Agent Handoff

## 1. Summary

- Status: CONDITIONAL PASS
- Task: Fix prospect preview token minting + factual integrity in website prospect generation
- What was accomplished: Implemented tokenized preview URLs via canonical `#299` helpers; removed fabricated services/USPs/category defaults/rating defaults; added unit tests; pushed branch; opened Draft PR `#450`.
- Next action: Human review of Draft PR https://github.com/Kilchi555/driving-team-app/pull/450 after required CI; do not merge without separate authorization.
- Human approval required: YES

## 2. Git State

- Repository: Kilchi555/driving-team-app
- Branch: `cursor/prospect-preview-token-facts-e5ac`
- HEAD SHA: `37f8a36b6e834f193754bf3c1b0bc6bfbd87cf42`
- Base SHA: `a75e065eed1ed7143b0e49718976b9b0209979bd` (`origin/main` at branch creation)
- Pull request: https://github.com/Kilchi555/driving-team-app/pull/450 (Draft)
- Working tree: DIRTY only if handoff files pending commit — see tip

## 3. Changes

- Files changed:
  - `server/utils/website-prospect-generate.ts` — mint token, fail closed, source-grounded facts
  - `server/utils/website-prospect-landing-facts.ts` — pure factual helpers
  - `server/utils/__tests__/website-prospect-landing-facts.test.ts` — regressions
  - `.cursor/docs/gates/20261016-prospect-preview-token-facts.md` — Implementation Gate
  - `artifacts/handoffs/SIMY_HANDOFF*.md` — this handoff
- Important implementation details:
  - Reuses `issueWebsitePreviewToken` + `previewUrlForPath` (same as `/api/website/preview-link` and former `#302`)
  - Re-generation rotates the token
  - Missing business type → `generic` (unknown), never invented `driving_school`
  - No claim/checkout/publish/billing/migration/production writes
- Audit delta vs prior investigation: confirmed on current main `a75e065e` — bare `preview_url`, fabricated Kat. B/Motorrad + USPs, `|| 'driving_school'` still present before this PR
- Requested work not completed: production live preview verification; merge; deploy

## 4. Verification

- Unit tests: PASS — `website-prospect-landing-facts` (9) + `website-public-security` (6); score suite (15) also PASS
- Integration tests: NOT RUN
- E2E tests: NOT RUN locally
- Lint: PASS — `npm run lint` exit 0
- Typecheck: NOT RUN
- Required CI checks: NOT RUN / pending on Draft PR `#450` — do not claim PASS
- Production smoke test: NOT RUN

## 5. Risks and Open Issues

- Known risks: token rotation on re-generate; orphaned media if mint fails after ingest; `generic` placeholder for unknown category
- Failed or missing checks: typecheck, e2e, production smoke, required CI not yet claimed
- Unverified assumptions: claim SQL still unapplied in prod (out of scope)
- Remaining limitations: visitor factory `#302` still unmerged; claim mint API still unwired
- Note: `.cursor/rules/agent-handoff.mdc` is not on `main` yet (Draft `#432`); handoff written under `artifacts/handoffs/` per that protocol

## 6. External Actions and Production Safety

- Commit created: YES — `37f8a36b6e834f193754bf3c1b0bc6bfbd87cf42`
- Remote push: YES — `origin/cursor/prospect-preview-token-facts-e5ac`
- Pull request created or updated: YES — Draft https://github.com/Kilchi555/driving-team-app/pull/450
- Merge: NO
- Deployment: NO
- Production database changes: NO
- Migration applied: NO
- Real customer or financial data changed: NO
- Other externally visible side effects: YES — Draft PR may trigger CI

## 7. Next Step

- Exact recommended next action: Monitor required checks on `#450`; human review; merge only with separate authorization.
- Required human decision or approval: Merge to `main`; optional post-merge production smoke of prospect preview.
- If blocked: none within authorized scope.
