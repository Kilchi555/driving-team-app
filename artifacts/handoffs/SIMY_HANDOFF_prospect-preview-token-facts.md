# SIMY — Agent Handoff

## 1. Summary

- Status: CONDITIONAL PASS
- Task: Fix prospect preview token minting + factual integrity in website prospect generation
- What was accomplished: Implemented tokenized preview URLs via canonical `#299` helpers; removed fabricated services/USPs/category defaults/rating defaults; added unit tests; pushed branch; opened Draft PR.
- Next action: Human review of Draft PR after required CI (Test and lint, E2E login, Dependency review); do not merge without separate authorization.
- Human approval required: YES

## 2. Git State

- Repository: Kilchi555/driving-team-app
- Branch: `cursor/prospect-preview-token-facts-e5ac`
- HEAD SHA: `37f8a36b6e834f193754bf3c1b0bc6bfbd87cf42`
- Base SHA: `a75e065eed1ed7143b0e49718976b9b0209979bd` (`origin/main` at branch creation; includes `#444`)
- Pull request: (filled after create)
- Working tree: CLEAN after commit

## 3. Changes

- Files changed:
  - `server/utils/website-prospect-generate.ts` — mint token, fail closed, use source-grounded facts
  - `server/utils/website-prospect-landing-facts.ts` — pure factual helpers
  - `server/utils/__tests__/website-prospect-landing-facts.test.ts` — regressions
  - `.cursor/docs/gates/20261016-prospect-preview-token-facts.md` — Implementation Gate note
- Important implementation details:
  - Reuses `issueWebsitePreviewToken` + `previewUrlForPath` from `website-preview-access.ts`
  - Re-generation rotates token (same as `/api/website/preview-link`)
  - Missing business type → `generic` (unknown), never `driving_school`
  - No claim/checkout/publish/billing/migration changes
- Requested work not completed:
  - Production verification of live previews — not authorized
  - Merge / deploy — not authorized
  - `.cursor/rules/agent-handoff.mdc` still not on `main` (lives in open Draft PR `#432`); handoff written to `artifacts/handoffs/` per that protocol

## 4. Verification

- Unit tests: PASS — vitest 15 tests (`website-prospect-landing-facts` 9 + `website-public-security` 6); also re-ran `website-prospect-score` 15 PASS
- Integration tests: NOT RUN — not in scope
- E2E tests: NOT RUN — not in scope locally
- Lint: PASS — `npm run lint` exit 0
- Typecheck: NOT RUN — known pre-existing `tsconfig` issues; not claimed
- Required CI checks: NOT RUN / pending on Draft PR — do not claim PASS
- Production smoke test: NOT RUN — no production access for writes or live preview verification

## 5. Risks and Open Issues

- Known risks:
  - Re-generation invalidates prior raw preview tokens by design
  - Orphaned storage media possible if mint fails after image ingest (shell rolled back)
  - `generic` is a schema placeholder for unknown category, not a claimed business type
- Failed or missing checks: typecheck, e2e, production smoke not run
- Unverified assumptions: Stripe/Google env unrelated; claim SQL still unapplied in prod (out of scope)
- Remaining limitations: Visitor Website Factory (`#302`) still unmerged; claim mint API still unwired

## 6. External Actions and Production Safety

- Commit created: YES — `37f8a36b6e834f193754bf3c1b0bc6bfbd87cf42`
- Remote push: YES — `origin/cursor/prospect-preview-token-facts-e5ac`
- Pull request created or updated: YES — Draft (see Summary / PR URL)
- Merge: NO
- Deployment: NO
- Production database changes: NO
- Migration applied: NO
- Real customer or financial data changed: NO
- Other externally visible side effects: NO — Draft PR / CI may start on GitHub

## 7. Next Step

- Exact recommended next action: Wait for required CI on the Draft PR; human review; merge only with separate authorization.
- Required human decision or approval: Merge into `main`; any production smoke of prospect preview after merge.
- If blocked: none for this task’s authorized scope.
