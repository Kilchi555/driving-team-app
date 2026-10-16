# SIMY — Agent Handoff

## 1. Summary

- Status: CONDITIONAL PASS
- Task: Hausnummer im Rechnungsvorschau-Editor separat bearbeiten und als `billing_street_number` speichern.
- What was accomplished: View-Editor hat ein eigenes Nummernfeld. Der Save-Payload sendet die Nummer inklusive `''`. Nach Erfolg wird die Abbrechen-Basis auf den gespeicherten Stand gesetzt. Draft-PR ist vorbereitet, nicht gemergt.
- Next action: Mensch prüft den Draft-PR. Nicht mergen und nicht aus Draft nehmen, bis das separat freigegeben ist.
- Human approval required: YES

## 2. Git State

- Repository: Kilchi555/driving-team-app
- Branch: `cursor/invoice-preview-street-number-save-4000`
- HEAD SHA: Fix-Commit `4247ba1bf5e29f7b70d3747d94604e54fbff168e`. Der Commit, der diese PR-URL nachträgt, ist danach die Branch-Spitze; die lebendige `headRefOid` von PR #454 ist massgebend.
- Base SHA: `a75e065eed1ed7143b0e49718976b9b0209979bd`
- Pull request: https://github.com/Kilchi555/driving-team-app/pull/454 (Draft)
- Working tree: diese Datei ist Teil des beabsichtigten Commits. Der ältere Audit-Handoff `artifacts/handoffs/SIMY_HANDOFF_pr442-post-merge.md` bleibt unversioniert und wird nicht mitcommitted.

## 3. Changes

- Files changed:
  - `components/InvoicePreviewModal.vue`
  - `utils/billing-address-map.ts`
  - `server/utils/__tests__/invoice-preview-view-billing.test.ts`
  - `artifacts/handoffs/SIMY_HANDOFF_invoice-preview-street-number-fix.md`
- Important implementation details: siehe unten.
- Requested work not completed: kein Merge, kein Deploy, keine Produktionsdaten.

## 4. Verification

- Unit tests: PASS — lokal, siehe unten. CI: NOT RUN bis der PR-Lauf startet.
- Integration tests: NOT RUN
- E2E tests: NOT RUN
- Lint: PASS — `npx eslint "server/utils/__tests__/**/*.ts" --max-warnings 0`, Exit 0. `utils/billing-address-map.ts` hat einen vorbestehenden `no-control-regex`-Fehler ausserhalb dieses Fixes. Die CI-Lint-Regel prüft nur die Testdateien.
- Typecheck: PASS für die geänderten TypeScript-Module (`tsc -p` mit Nuxt-Config, Exit 0). Die Vue-Datei war nicht im Programm. Voller `vue-tsc` wurde nicht ausgeführt.
- Required CI checks: NOT RUN
- Production smoke test: NOT RUN

## 5. Risks and Open Issues

- Known risks: Draft-PR #445 würde `billing_street_number` auf `POST /api/invoices/update` ablehnen, weil seine Allowlist das Feld nicht enthält. Auf aktuellem `main` gibt es diese Allowlist nicht.
- Failed or missing checks: CI und voller Vue-Typecheck.
- Unverified assumptions: keine.
- Remaining limitations: Speichern ändert nur die Rechnung, deren Adresse der Benutzer speichert. Historische Rechnungen werden nicht korrigiert.

## 6. External Actions and Production Safety

- Commit created: YES — `4247ba1bf5e29f7b70d3747d94604e54fbff168e`
- Remote push: YES — `cursor/invoice-preview-street-number-save-4000`
- Pull request created or updated: YES — Draft https://github.com/Kilchi555/driving-team-app/pull/454
- Merge: NO
- Deployment: NO
- Production database changes: NO
- Migration applied: NO
- Real customer or financial data changed: NO
- Other externally visible side effects: NO

## 7. Next Step

- Exact recommended next action: Draft-PR lesen. Wenn #445 zuerst merget, `billing_street_number` in dessen Allowlist aufnehmen, bevor dieser Fix live geht.
- Required human decision or approval: Merge und Deploy nur nach separater Freigabe.
- If blocked, the precise blocker and the minimum action needed to unblock it: keiner für den Draft. Merge ist absichtlich nicht ausgeführt.

---

## Ausgangszustand und Root Cause

`main` ist `a75e065eed1ed7143b0e49718976b9b0209979bd`. PR #442 ist gemergt. Der View-Editor in `components/InvoicePreviewModal.vue` band die Strasse an `localViewBilling.street`, hielt die Nummer in `localViewBilling.street_nr` und sendete in `saveViewBilling` kein `billing_street_number`. „Abbrechen“ lud die Props neu, also die alte Nummer.

Offene PRs: #445 ändert nur `server/api/invoices/update.post.ts` und eine neue Allowlist, nicht den Editor. #448 ist Dokumentation. Keiner speichert die Hausnummer im Vorschau-Editor. Es wurde kein bestehender PR erweitert.

## Implementierung

- View-Editor: Strasse und `Nr.` getrennt, analog zum Draft-Editor. Lesen weiter über `formatInvoiceStreetLine`.
- `viewBillingUpdatePayload` setzt `billing_street` ohne angehängte Nummer und `billing_street_number` auf den Editorwert, auch `''`.
- Nach Erfolg ersetzt `savedViewBillingBaseline` die Abbrechen-Basis. Ein Fehler lässt die Eingaben stehen, setzt keine Erfolgsmeldung und zeigt `viewBillingSaveErrorMessage`.
- `POST /api/invoices/update` ist unverändert, inklusive `.eq('tenant_id', staffUser.tenant_id)` und der Rollenprüfung `admin`/`staff`.

## Tests

Befehl:

`./node_modules/.bin/vitest run server/utils/__tests__/billing-address-map.test.ts server/utils/__tests__/invoice-billing-snapshot.test.ts server/utils/__tests__/invoice-preview-view-billing.test.ts`

Ergebnis: Exit 0, 3 Dateien, 52 Tests. Davon 10 neu: Nummer `12` → `12a` und Reload `Bahnhofstrasse 12a`, Strassenwechsel behält `12`, leere Nummer wird gesendet und bleibt leer trotz Legacy `12`, Legacy `billing_street_nr` wird als `billing_street_number` gespeichert, `12a` wird nicht verdoppelt, Fehlerfall behält die Eingabe, Abbrechen nach Save stellt nicht die alte Nummer her, Tenant-Filter im Endpoint-Quelltext bleibt, der Vue-Editor bindet `street_nr` und den Payload-Helfer.

Lint der Testdateien: Exit 0.

Schmaler `tsc` der geänderten Module: Exit 0.

## Risiken

#445 lehnt unbekannte Update-Felder ab und kennt `billing_street_number` nicht. Dieser Fix sendet das Feld, weil `main` es heute speichert. Die beiden Drafts dürfen nicht blind zusammengeführt werden.
