# SIMY — Review-State Notification Storm

**Datum:** 2026-10-15  
**Repo:** Kilchi555/driving-team-app  
**Draft-PR:** https://github.com/Kilchi555/driving-team-app/pull/435  
**Verdict:** CONDITIONAL PASS

---

## 1. Verdict

**CONDITIONAL PASS**

Die permanente Idempotenz-Fix ist implementiert, getestet und als Draft-PR offen.  
Der **aktive Schedule auf `main` ist noch nicht contained** — dafür braucht es explizite Human-Authorization (siehe Abschnitt 2).

---

## 2. Incident Containment

| Frage | Befund |
|-------|--------|
| Schedule zu Beginn aktiv? | **Ja** — Workflow `374463645` `state=active`; auf `main` weiterhin `schedule: cron '*/15 * * * *'` |
| Was hat ihn gestoppt? | **Nichts auf `main`.** Branch/PR entfernt den Schedule erst nach Merge |
| Unabhängig verifiziert? | **Ja** — Main-Workflow-Inhalt + Actions-Workflow-State nach Push erneut gelesen |
| Extra-Authorization nötig? | **Ja.** Eine Option wählen: (1) Workflow auf main disablen via API, (2) Human-Merge von #435, (3) andere freigegebene Main-seitige Suppression |

**Draft-PR allein ist keine Containment.**

---

## 3. Root Cause und Fix

| Item | Wert |
|------|------|
| Pfade | `.github/workflows/review-state.yml`, `scripts/review-state.mjs` |
| Vorher | Schedule-Fan-out + append-only `createComment` bei jedem Lauf |
| Nachher | Schedule im PR entfernt; Update-in-Place / Skip-wenn-unverändert / Create nur wenn kein Marker; bounded Retries für 429/5xx |
| Branch | `cursor/review-state-notification-storm-bc94` |
| Head SHA | `d2e3ef07b2651bdac2a0c443ae786f8e80fd16d8` |
| Base SHA | `3b7fc0dd5fd047bf7aa6db1e4165d384450da52f` (#368, full SHA verifiziert) |
| Warum das hilft | Kein Cron nach Merge; selbst mit Schedule: semantisch gleiche Observations → **kein Write**; Änderungen → **PATCH** des trusted Markers (kein neuer Comment pro PR) |

### Incident-Zahlen (Untersuchung)

- Confirmierter Lauf: [`38666954356`](https://github.com/Kilchi555/driving-team-app/actions/runs/38666954356) — 112 Creates, dann Timeout
- Vorherige Schedule-Läufe nach #368: `38630767190` (102), `38653601302` (86)
- Peak Create-Minute: **01:47 UTC = 03:47 CEST** (passt zu ~150 E-Mails)

---

## 4. Tests

```text
npx vitest run utils/__tests__/review-state.test.ts
→ 83 passed
```

`npm run lint` → passed (Repo-Lint deckt nur `server/utils/__tests__/**/*.ts`; diese Dateien nicht).

Abgedeckt: create-once, update-in-place, unchanged skip, Rerun-Idempotenz, Duplikate, malformed/untrusted Authors, 429-Backoff, 403-no-retry, Schedule-Containment-Detection, Pagination/Stop.

Keine Production-GitHub-Write-Paths ausgeführt.

---

## 5. GitHub State

| Feld | Wert |
|------|------|
| Draft PR | https://github.com/Kilchi555/driving-team-app/pull/435 |
| Draft | **true** |
| Merged | **false** |
| Mergeable | `blocked` (erwartet für Draft / Protections) |
| Head / Base | `d2e3ef07…` → `3b7fc0dd…` (`main`) |
| Deployments | keine durch diesen Agent |
| Main-Workflow | weiterhin **active** mit Schedule |

---

## 6. Residual Risks

- Nächster delayed Schedule auf **main** kann weiterhin mass-create, bis Disable/Merge
- `workflow_dispatch` fan-outet weiterhin über alle open `base=main` PRs (create-sicher; API-lastig)
- Comment-Edits können bei manchen Notification-Settings noch sichtbar sein (deutlich leiser als Creates)
- Cron erst nach Post-Merge-Verification wieder aktivieren

---

## 7. Change Accounting

**Durchgeführt:** Branch von `origin/main`; 3 Code-Dateien + dieses Incident-MD; Commit; Push; Draft-PR #435; Vitest + Lint.

**Nicht durchgeführt:** Merge; Deploy; Workflow auf main disablen; Secret-/Settings-Änderungen; Bulk-PR-Comment-Edits; andere Workflows; Production-DB.

**Integrity:** Phase-0 war read-only; Implementation nur auf dem Feature-Branch.  
**Notification Storm ist auf `main` nicht als contained zu beanspruchen.**

---

## Nächster Human-Schritt (P0)

1. Schedule auf `main` sofort stoppen (Workflow disable **oder** #435 mergen), **dann**
2. Draft #435 reviewen / Gates / Ready-for-Review nur nach Human-Entscheidung
3. Nach Merge verifizieren: kein neuer Schedule-Fan-out, Idempotenz auf wenigen PRs per `workflow_dispatch`

---

## Resolution (post-merge)

| Item | Status |
|------|--------|
| #435 merged | Yes — idempotent publish (update / skip / create-once) on `main` (`15c5a64a`) |
| #439 merged | Yes — `*/15` schedule restored after update/skip landed (`254a2d95`) |
| Containment on `main` | Publication no longer append-only; schedule fan-out is safe only because of update/skip |
| Operator runbook | [`../REVIEW_STATE_PUBLICATION.md`](../REVIEW_STATE_PUBLICATION.md) |

This incident file stays as the investigation record. Treat the Resolution table as the current ops outcome; sections 2 and 5 above describe the **draft-era** state before merge.
