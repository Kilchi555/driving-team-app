# PR 458 — Sync mit main

**Bewertung: `CONDITIONAL`**

Der Branch enthält `main`. Der Merge hatte keine Konflikte. Der Draft bleibt ein Draft. Auf Head `7e2461787e0c6dbbaa0d310de019f7c3ba6944da` sind Test and lint, E2E login und Dependency review grün. Diese Ergebnisnotiz ist ein späterer Commit. Dessen eigene Required Checks sind beim Schreiben noch offen. Deshalb bleibt die Bewertung `CONDITIONAL`.

Beobachtet: `2026-10-17T09:06:59Z`

PR: https://github.com/Kilchi555/driving-team-app/pull/458

## Status

| | Vorher | Nachher |
| --- | --- | --- |
| Draft | `true` | `true` (unverändert) |
| Base-Branch | `main` | `main` |
| Head-Branch | `cursor/custom-domain-routing-gate-5594` | gleich |
| Head-SHA | `38c0444955c86b65d42a9a18979b1ce1f7cc3274` | Geprüfter Head `7e2461787e0c6dbbaa0d310de019f7c3ba6944da`. Diese Ergebnisnotiz folgt danach. |
| `origin/main` | `e2c1c68c645620f2e999d6f57716950a6f436f97` | gleich, und Vorfahre des Heads |
| GitHub `baseRefOid` | `ecf9694ff5b6626539ad0230fee2ca1c3a3d6121` (Merge-Base) | `e2c1c68c645620f2e999d6f57716950a6f436f97` |
| Merge-Status | `MERGEABLE` und `BEHIND` | `MERGEABLE` und `UNSTABLE`. `UNSTABLE` ist der App-Store-Status, kein Konflikt. |
| Reviews | keine | keine |
| Review-Threads | 0, davon 0 offen | unverändert |
| `reviewDecision` | leer | leer |

Nicht ausgeführt: Undraft, Approve, Merge, Deployment, Production-SQL.

## Was aus main dazukam

Vier Commits lagen auf `main` und fehlten im PR:

1. `a9a9745123e124d51ad5fa13a84523055c3a90ef` — Firma nur nach Mandantenprüfung speichern (#461)
2. `76c0a5b4d1a2100ba848d77983dde0e186a5b2f6` — Firma vor Nebenwirkungen der Rechnung prüfen (#466)
3. `971ed50398fec2161f223b921b47c0419cad3a1c` — Entwurf für irrtümliche Beleg-Rücksetzung (#455)
4. `e2c1c68c645620f2e999d6f57716950a6f436f97` — grösseres Landing-Logo und Hash-Sprünge unter fixer Navigation (#468)

## Merge

Commit: `52d65db9ef1e93d4220f098c5134b49e95332599`

Eltern:

- `38c0444955c86b65d42a9a18979b1ce1f7cc3274` (bisheriger PR-Head)
- `e2c1c68c645620f2e999d6f57716950a6f436f97` (`origin/main`)

Normaler Merge. Kein Rebase, kein Force-Push, kein History-Rewrite.

Konfliktmarker: keine. `git diff --check` ohne Befund.

Git hat zwei Dateien selbst zusammengeführt. Es gab keine manuelle Konfliktlösung:

- `pages/s/[subdomain]/index.vue`
- `pages/s/[subdomain]/[slug].vue`

Beide behalten die PR-Logik `custom_domain_routing_enabled === true` für Redirect und Canonical. Beide behalten aus `main` die Logo-Breite 252, `scrollToLandingTarget('kontakt')` und die Navbar-CSS-Anpassung.

Unverändert gegenüber dem alten PR-Head, Diff leer:

- `server/utils/custom-domain-tls.ts`
- `server/utils/custom-domain.ts`
- `server/middleware/02.custom-domain.ts`
- `server/api/website/custom-domain.post.ts`
- `server/api/website/custom-domain/verify.post.ts`
- die Custom-Domain-Tests
- `sql_migrations/20261016_protect_website_custom_domain_evidence.sql`
- `tsconfig.json`

Unverändert gegenüber `origin/main`, Diff leer:

- `server/utils/invoice-company-link.ts`
- `server/utils/payment-receipt-reset.ts`
- `server/api/invoices/create.post.ts`
- `server/api/invoices/send-draft.post.ts`
- `.github/workflows/ci.yml`
- `package.json`

## TLS- und Security-Stand

Die Live-Prüfung bleibt fail-closed:

- `hasAuthoritativeTlsEvidence()` ohne Argument gibt `false` zurück.
- Gespeichertes `tls.ok`, DNS und `vercel.verified` sind kein Zertifikat.
- Der Handshake läuft nur, wenn Veröffentlichung, Plattform, DNS und Frische schon wahr sind.
- Private und nicht öffentliche IPv4-Adressen werden nicht gewählt.
- Eine Verbindung, Port 443, Servername ist der gespeicherte Hostname.
- Unbekannte Hosts und Lookup-Fehler bleiben 404.
- `app.simy.ch` und andere App-Hosts gehen nicht durch das Custom-Host-Gate.

Die SQL-Datei bleibt ein nicht angewendeter Plan. Sie wurde nicht auf Produktion oder Staging ausgeführt.

## Tests in dieser Umgebung

Bestanden, `npx vitest run`, 2026-10-17:

| Datei | Ergebnis |
| --- | --- |
| `custom-domain-routing-gate.test.ts` | 21 bestanden |
| `custom-domain-tls.test.ts` | 9 bestanden |
| `custom-domain-app-host.test.ts` | 5 bestanden |
| `tsconfig-json.test.ts` | 1 bestanden |
| `website-landing-scroll.test.ts` | 2 bestanden |
| `invoice-company-link.test.ts` | 19 bestanden |
| `invoice-create-company-order.test.ts` | 8 bestanden |
| `payment-receipt-reset.test.ts` | 14 bestanden |
| `invoice-company-link.db.test.ts` | 6 bestanden, eingebettetes PGlite |
| `website-landing-nav.browser.test.ts` | 9 bestanden, Playwright Chromium |

Summe: 94 Tests, 10 Dateien, Exit 0.

`npm run lint` (ESLint auf `server/utils/__tests__/**/*.ts`, `--max-warnings 0`): Exit 0.

Pre-push-Smoke-Test beim Push von `50edfad1`: lokaler Nitro-Build, `/api/health` lieferte `200` und `{"status":"ok"}`. Das ist kein Deployment.

## Nicht ausgeführt

- Voller `npm test`. `payment-receipt-reset.db.test.ts` bricht ohne `RECEIPT_RESET_TEST_DATABASE_URL` ab. Die Variable war nicht gesetzt. Es gibt hier kein lokales Postgres und kein Docker. Die Variable wurde nicht auf Produktion gelegt.
- Repository-weites `nuxi typecheck` / `vue-tsc`. Der letzte abgeschlossene Lauf auf diesem PR war rot (4723 Diagnosen). `tsconfig.json` ist seit `38c04449` unverändert. Der JSON-Parse-Test für `strict: true` ist grün. Ein grüner Typecheck wird nicht behauptet.
- Die Required Checks auf dem Commit dieser Ergebnisnotiz. Die Tabelle unten gilt für `7e246178`, nicht automatisch für den Folgecommit.

## Offene Website-PRs

Nicht angefasst. Kein gemeinsamer Dateipfad mit #458:

- #436 `utils/website-billing.ts` (Entitlement-Entscheidung), Draft, hinter `main`
- #438 Entitlement-Reconciler, Draft, hinter `main`
- #450 Prospect-Preview-Tokens, Draft, hinter `main`
- #465 GBP-/Website-Audit, nur Doku
- #469 Plan für Öffnungszeiten und Profile, nur Doku

#468 ist bereits in `main` und in diesem Merge enthalten.

## GitHub-Checks auf `7e246178`

Gelesen `2026-10-17T09:06:59Z`. Head und Base waren unverändert. `origin/main` ist Vorfahre. Review-Threads: 0. `reviewDecision` leer. Draft `true`.

| Check | Ergebnis | Abschluss |
| --- | --- | --- |
| Test and lint | success | `2026-10-17T09:03:18Z` |
| E2E login | success | `2026-10-17T09:02:17Z` |
| Dependency review | success | `2026-10-17T09:00:55Z` |
| CodeQL | success, nicht erforderlich | `2026-10-17T09:01:16Z` |
| App \| Default | failure, nicht im Ruleset | `2026-10-17T09:03:36Z` |
| App \| Default \| Archive - iOS | action_required, nicht im Ruleset | `2026-10-17T09:03:24Z` |

Test and lint: https://github.com/Kilchi555/driving-team-app/actions/runs/39019496828/job/117358288024

E2E login: https://github.com/Kilchi555/driving-team-app/actions/runs/39019496828/job/117358287879

Dependency review: https://github.com/Kilchi555/driving-team-app/actions/runs/39019496882/job/117358287836

Für `7e246178` und `50edfad1` ist kein GitHub-Deployment eingetragen.

## Risiken

- Der Draft blockiert den Merge-Button. Das bleibt so.
- Die grünen Required Checks gehören zu `7e246178`. Der Commit dieser Notiz braucht dieselben drei Checks auf seinem eigenen SHA.
- Der Projekt-Typecheck ist weiterhin kein grünes Gate. CI hat ihn nicht ausgeführt.
- Die Custom-Domain-SQL-Datei darf nur über das menschliche Datenbank-Gate laufen.
- `fahrschule-sara.ch` wird durch diesen Sync nicht umgestellt.
- App-Store-Fehler ändern das Ruleset nicht.

## Nächste Aktion

Die drei Required Checks auf dem Commit dieser Ergebnisnotiz abwarten und den Draft danach von einem Menschen prüfen lassen.
