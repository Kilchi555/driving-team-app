# SIMY — Agent Handoff

## 1. Summary

- Status: **REMEDIATED — WAITING ON HUMAN REVIEW** (no agent undraft/merge)
- Task: Human Risk Acceptance Gate for Draft PR #450 — updated after confirmed product-decision remediations
- What was accomplished: Prior unchecked acceptance packet was superseded by implementing the four confirmed product decisions on the same draft PR. See `SIMY_HANDOFF_pr450_residual-risk-remediation.md`.
- Next action: Human reviews remediation evidence + tip CI; then — only with **separate** undraft/merge authorization — proceed under ship-to-main.
- Human approval required: **YES**

### Live verification (start of remediation, UTC 2026-10-16T12:07:28Z)

| Item | Expected / prior | Actual at start | Match? |
|------|------------------|-----------------|--------|
| PR | https://github.com/Kilchi555/driving-team-app/pull/450 | same | YES |
| State | OPEN · DRAFT | OPEN · DRAFT | YES |
| HEAD | `468800b2d83628add087bb6890d171a307f631fe` | `468800b2…` | YES |
| Base | `a75e065eed1ed7143b0e49718976b9b0209979bd` | same | YES |

Post-remediation tip SHA is recorded in the remediation handoff / PR after push (differs from `468800b2`).

---

## 2. Git State

- Repository: Kilchi555/driving-team-app
- Branch: `cursor/prospect-preview-token-facts-e5ac`
- Pull request: https://github.com/Kilchi555/driving-team-app/pull/450 (OPEN · DRAFT — must stay draft)
- Prior HEAD: `468800b2d83628add087bb6890d171a307f631fe`
- Prior Base: `a75e065eed1ed7143b0e49718976b9b0209979bd`
- Related handoff: `artifacts/handoffs/SIMY_HANDOFF_pr450_residual-risk-remediation.md`

---

## 3. Residual risks — remapped after product decisions

| # | Prior risk | Product decision | Remediation outcome |
|---|------------|------------------|---------------------|
| 1 | Orphan media after failed token mint | Reuse compression; narrow idempotent cleanup | On **created** failure after upload: delete allowlisted ingest paths, then rollback tenant/website. Never delete blobs referenced by remaining/published sites. |
| 2 | Token rotation invalidates preview links | Keep stable while valid/safe | `ensureWebsitePreviewToken` reuses valid token from `preview_url`; rotate only when expired/mismatched/`force_rotate`. |
| 3 | `generic` default VAT 8.1% | Authoritative or explicit selection; no silent 8.1% | `resolveProspectVatRate` + UI/PATCH persistence on `analysis.vat_selection`. Education → 0. Missing → 400. No migration. |
| 4 | Missing `finishProspectSite` integration test | Executable integration coverage | `website-prospect-finish-integration.test.ts` exercises orchestration with mocks only at external boundaries. |

Prior gate file retained for trail: `SIMY_HANDOFF_pr450_residual_risk_gate.md` (pre-remediation CONDITIONAL PASS).

---

## 4. Verification

- Focused vitest + eslint on test tree: **PASS** (see remediation handoff for commands)
- Required CI on new tip: **PENDING** after push
- Undraft / approve / merge by agent: **NOT PERFORMED** (forbidden)

---

## 5. Human decision (do not pre-check)

Fill in by a human. Agents must leave boxes unchecked.

### Acceptance checklist

* [ ] Remediations for all four residual risks reviewed and accepted.
* [ ] Explicit MwSt selection UX + persistence accepted (no silent 8.1% for ambiguous types); understood as **not** tax advice.
* [ ] Separate Freigabe zum Undraften und Mergen erteilt.

### Decision record (human fills)

| Field | Value |
|-------|--------|
| Decider name / role | _pending_ |
| Date (UTC) | _pending_ |
| Notes / conditions | _pending_ |
| Outcome | _pending — ACCEPT / REJECT / DEFER_ |

**Agent rule:** Even if all boxes above are later checked by a human in this file, undraft/merge still requires an **explicit separate instruction** in chat or an authorized process — this handoff alone is not merge authority.

---

## 6. External Actions and Production Safety

- Code remediations committed/pushed to draft PR branch: **YES** (this turn)
- PR undraft / approve / merge: **NO**
- Deployment / workflow dispatch: **NO**
- Production / staging data changes: **NO**
- Production migrations: **NO**

---

## 7. Next Step

- Exact recommended next action: Human reviews `SIMY_HANDOFF_pr450_residual-risk-remediation.md` and tip CI; keep #450 draft until separate undraft/merge authorization.
- If HEAD/Base/CI change materially before decision: re-verify live PR state before using this packet.
