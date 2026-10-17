# Unabhängige Prüfung — Legal Pages HTTP 500 (Fahrschule Sara)

## Aktueller Stand nach Vertragskorrektur

`CONDITIONAL — SPECIFIC BLOCKERS`

Kanonischer Branch: `cursor/legal-pages-http-500-adc4`. Vertrag wieder HTTP 400/400. Draft-PR: https://github.com/Kilchi555/driving-team-app/pull/457. `app.simy.ch` liefert den Fix weiterhin nicht aus. Die erforderliche CI auf dem PR-HEAD ist bei diesem Nachtrag noch nicht abgeschlossen. Kein Merge.

Der Abschnitt darunter ist der Read-only-Befund von 2026-10-16, 12:02 UTC, und bleibt unverändert als Nachweis. Der Nachtrag am Ende ist der spätere Arbeitsstand.

## Gesamturteil der Read-only-Prüfung von 12:02 UTC

`CONDITIONAL — SPECIFIC BLOCKERS`

Die damals gemeldeten SHAs stimmten. Der Branch enthielt einen Code-Fix und bestandene Unit-Tests. `app.simy.ch` lieferte ihn nicht aus. Unbekannter `type` war auf dem Branch HTTP 404, auf `main` HTTP 400. Die Read-only-Prüfung hat daran nichts geändert. Die spätere Korrektur steht im Nachtrag.

## 1. Beobachtung

| | |
| --- | --- |
| Zeitpunkt | 2026-10-16, etwa 11:59:51Z bis 12:02:23Z |
| Live-HTTP | 2026-10-16, kurz nach 12:00:23Z |
| Git-Stand nach `git fetch` | derselbe Zeitpunkt |

## 2. Git

Selbst geprüft nach `git fetch origin main cursor/legal-pages-http-500-adc4`:

| | SHA / Wert |
| --- | --- |
| Branch | `cursor/legal-pages-http-500-adc4` |
| HEAD, auch `origin/cursor/legal-pages-http-500-adc4` | `c795ba04bd12f5c5ae23e6647e5342b46a3f9530` |
| Produkt-Commit, Parent von HEAD | `94f07a8396415de74a50880422de6d5c9b6273d2` |
| `origin/main` | `57543d57dd27b9ceabd84894cc74a1123fdb45dd` |
| Merge-Base von HEAD und `origin/main` | `57543d57dd27b9ceabd84894cc74a1123fdb45dd` |

Die im Auftrag genannten SHAs treffen zu. `f1efbe6d` ist nicht mehr `origin/main`. Seit der Merge-Base hat `main` keinen Commit, den der Branch nicht hat. Der Branch liegt zwei Commits vor `main`:

1. `94f07a83` `fix(website): defer legal HTML sanitizer initialization`
2. `c795ba04` `docs(website): record the legal-pages implementation handoff`

`94f07a83` ist kein Ancestor von `origin/main`.

Diff `origin/main...HEAD`, 8 Dateien, +641 / −33:

- `utils/sanitize-tenant-html.ts`
- `server/api/public/website/[subdomain]/legal.get.ts`
- `pages/s/[subdomain]/impressum.vue`
- `pages/s/[subdomain]/datenschutz.vue`
- `server/utils/__tests__/website-legal-pages.http.test.ts` (neu)
- `server/utils/__tests__/website-legal-sanitizer-fallback.http.test.ts` (neu)
- `server/utils/__tests__/p1-upload-vhtml-hours.test.ts`
- `artifacts/handoffs/SIMY_HANDOFF_pr1-legal-pages-implementation.md`

Kein Unterschied an `buildImpressumHtml`, `buildDatenschutzHtml`, Adresse, Karte, Schema, Testimonials, Team, SEO, Katalog oder Migrationen.

## 3. Code, unabhängig gelesen

### Routen aus dem Code, nicht geraten

- HTML: `pages/s/[subdomain]/impressum.vue` und `pages/s/[subdomain]/datenschutz.vue`
- Öffentliche Pfade: `/s/fahrschule-sara/impressum` und `/s/fahrschule-sara/datenschutz`
- Beide Seiten rufen per `$fetch` auf: `/api/public/website/:subdomain/legal?type=impressum` bzw. `type=datenschutz`
- `www.fahrschule-sara.ch` ist eine andere Site. Siehe Live-Nachweis.

### Sanitizer

Auf `origin/main` beginnt `utils/sanitize-tenant-html.ts` mit `import DOMPurify from 'isomorphic-dompurify'`.

Auf dem Branch wird DOMPurify erst im ersten Aufruf per `createRequire` geladen, innerhalb von try/catch. Ein Fehlschlag wird für den Prozess gecacht und liefert kein Purify-Objekt. `trySanitizeTenantHtml` gibt dann `{ ok: false }` zurück und nie den Eingabestring. `sanitizeTenantHtml` und `sanitizeSvgMarkup` geben bei Fehlschlag `''` zurück.

Das ist im Branch-Quelltext so. Ob Nitro/`createRequire` beim Vercel-Build wieder zu einem Import zur Ladezeit wird, ist nicht geprüft. Es wurde kein Production-Build ausgeführt.

### Reglement

Im Branch gibt es keinen Rückgabepfad für `reg.content`. Datenschutz-HTML aus `tenant_reglements` wird nur zurückgegeben, wenn der Inhalt ein nicht leerer String ist und `trySanitizeTenantHtml` `ok: true` mit nicht leerem Ergebnis liefert. Sonst fällt der Handler auf `buildDatenschutzHtml` zurück. Dessen Tenant-Felder laufen durch `escapeHtml` (`& < > "`). Schlägt die Sanitization dieses bereits escapten Generator-Strings fehl, wird genau dieser String zurückgegeben, nicht das Reglement.

Andere Aufrufer von `sanitizeTenantHtml` / `sanitizeSvgMarkup` (Onboarding, Registrierung, Admin-Vorschau, Reglemente-Manager, ConfirmationDialog, Tenant-Logo, Kategorie-SVG) bekommen bei einem Sanitizer-Ausfall neu einen leeren String statt einer Exception. Der Erfolgspfad mit derselben Tag- und Attributliste ist unverändert. Das ist fail-closed, aber ein Verhaltenswechsel für diese Seiten, sobald der Branch ausgeliefert würde.

### HTTP im Branch

- fehlender `type`: 400 `type required`
- unbekannter `type`: 404 `Unknown legal type`
- leerer Subdomain-Parameter: 404 `Website not found`
- unbekannte Website, unveröffentlicht ohne gültiges Token, fehlender Tenant: 404
- Tenant-Query-Fehler: 404 `Tenant not found`, ohne `tenantError.message`
- sonstige Exception: 500 `Server Error`, ohne Originaltext
- die Vue-Seiten setzen den Dokument-Status nicht. Eine 5xx-API zeigt die Überschrift „Rechtstext vorübergehend nicht verfügbar“. Andere Fehler bleiben „Nicht gefunden“. `v-html` nur im Erfolgszweig.

### Was Unit-Tests nicht beweisen

Sie starten den Handler unter Vitest mit einem Supabase-Double. Sie beweisen nicht, dass `app.simy.ch` den Branch ausführt, und sie beweisen nicht die Produktions-Exception.

## 4. Tests in dieser Prüfung

Ausgeführt, Exit 0, Start laut Vitest 12:00:07 (UTC, direkt nach 11:59:51Z):

```
npx vitest run \
  server/utils/__tests__/website-legal-pages.http.test.ts \
  server/utils/__tests__/website-legal-sanitizer-fallback.http.test.ts \
  server/utils/__tests__/p1-upload-vhtml-hours.test.ts \
  server/utils/__tests__/website-public-security.test.ts
```

```
Test Files  4 passed (4)
Tests       30 passed (30)
```

14 Legal-Handler, 3 Sanitizer-Fallback, 7 bestehende P1-Sanitizer-Tests, 6 Public-Security-Tests.

Zusätzlich, Exit 0:

```
npx eslint \
  server/utils/__tests__/website-legal-pages.http.test.ts \
  server/utils/__tests__/website-legal-sanitizer-fallback.http.test.ts \
  server/utils/__tests__/p1-upload-vhtml-hours.test.ts \
  server/utils/__tests__/website-public-security.test.ts \
  --max-warnings 0
```

Nicht ausgeführt: volles `npm test`, Playwright, Dependency Review, `vue-tsc` / Nuxt-Typecheck (im Repo kein CI-Typecheck; `typescript.typeCheck` ist false), Production-Build, Browser-Klickpfad.

Die frühere Meldung „24 Tests und eingeschränkter ESLint“ stammt aus dem Implementierungsbericht. Diese Prüfung hat die 24 plus die 6 Security-Tests selbst gesehen und ESLint nur für diese vier Dateien erneut laufen lassen, nicht für `server/utils/__tests__/**/*.ts` insgesamt.

## 5. Beanstandungen

| # | Beanstandung | Status | Beleg |
| --- | --- | --- | --- |
| 1 | Öffentliche Legal-API für Impressum und Datenschutz liefert HTTP 500 | **FAIL** | Live 2026-10-16: beide URLs HTTP 500, Body nur `statusCode` 500 und `statusMessage`/`message` `Server Error`. Kein `html`-Feld. Der Branch ändert den Handler, ist aber nicht deployt. |
| 2 | HTML-Routen HTTP 200 mit „Nicht gefunden“ | **FAIL** | Live: `/s/fahrschule-sara/impressum` und `/datenschutz` HTTP 200, sichtbares `<h1>Nicht gefunden</h1>`. Payload enthält den API-500. Die neue Überschrift „Rechtstext vorübergehend nicht verfügbar“ kommt im HTML nicht vor. |
| 3 | DOMPurify-Initialisierung darf die Rechtsseiten nicht unkontrolliert abreissen | **PARTIAL — CODE CHANGE EXISTS, LIVE RESULT UNVERIFIED** | Branch lädt DOMPurify erst beim ersten Aufruf. Vitest: fehlender `type` bleibt 400, auch wenn der Test-Loader wirft. Produktions-Stack fehlt. Live antwortet weiter 500, inklusive fehlendem `type`, also läuft der alte Modulstart noch. Ob `createRequire` im Nitro-Bundle lazy bleibt, ist nicht gebaut worden. |
| 4 | Reglement-HTML nie ungefiltert bei Sanitizer-Fehler | **PARTIAL — CODE CHANGE EXISTS, LIVE RESULT UNVERIFIED** | Branch-Quelltext und Fallback-Test: bei werfendem Loader kein `<script>`, kein Reglement-Text, stattdessen Generator-Text. Live-500 enthält kein HTML. Der neue Pfad ist nicht deployt. |
| 5 | Fehlerantworten ohne interne Details | **PARTIAL — CODE CHANGE EXISTS, LIVE RESULT UNVERIFIED** | Live-500-Body ist nur `Server Error`, ohne Stack, ohne `isomorphic-dompurify`, ohne `jsdom`. Branch entfernt zusätzlich `tenantError.message` und ersetzt unerwartete Throws durch `Server Error`. Dieser Branch-Pfad ist nicht deployt. |
| 6 | Bestehende HTTP-Statuscodes und API-Verträge bleiben konsistent | **FAIL** | Vertrag auf `origin/main` ist 400 für fehlenden Subdomain-Parameter, fehlenden `type` und unbekannten `type`, Meldung `subdomain and type required`. Der Branch macht unbekannten `type` zu 404 und leeren Subdomain-Parameter zu 404. Details in Abschnitt 6. |
| 7 | Öffentliche Seiten müssen nach dem Deployment funktionieren | **FAIL** | Production-Deployment von `simy-app` ist `57543d57` (2026-10-16T11:45:24Z, Vercel-Status success). `94f07a83` und `c795ba04` kommen in 8239 gelesenen GitHub-Deployments nicht vor. Die Live-Seiten zeigen das alte Fehlerbild. |

## 6. Statuscode-Vertrag 400 oder 404

**Bestehender Vertrag ist HTTP 400.** Quelle ist der Handler auf `origin/main`, der auch der letzte Production-SHA ist:

```ts
if (!subdomain || !['impressum', 'datenschutz'].includes(type)) {
  throw createError({ statusCode: 400, statusMessage: 'subdomain and type required' })
}
```

Das gilt für drei Fälle gemeinsam: kein `type`, `type` weder `impressum` noch `datenschutz`, leerer Subdomain-Parameter. Auf `main` gibt es keinen Test, der diesen Status festschreibt. Die Gate-Matrix im früheren Bericht nannte für fehlenden und unbekannten `type` ebenfalls 400. Das ist ein früherer Bericht, der zum Quelltext auf `main` passt.

**Der Branch liefert für unbekannten `type` HTTP 404** `Unknown legal type` und für einen leeren Subdomain-Parameter HTTP 404 `Website not found`. Fehlender `type` bleibt 400, die Meldung wechselt zu `type required`. Die neuen Tests erwarten genau dieses 404. Sie dokumentieren den Branch, nicht den alten Vertrag.

Der spätere Implementierungsauftrag hatte 404 für unbekannten `type` verlangt. Das erklärt die Abweichung. Es ersetzt den Vertrag auf `main` nicht. Diese Prüfung entscheidet nicht, welcher Code „besser“ ist.

Live kann den alten 400 heute nicht zeigen: fehlender `type` und `type=nope` sind ebenfalls HTTP 500 `Server Error`. Der Handler auf Production kommt nicht bis zu seiner eigenen Prüfung.

### Minimaler Korrekturvorschlag, nicht angewendet

Nur wenn der Vertrag von `main` gelten soll. Eine Stelle in `server/api/public/website/[subdomain]/legal.get.ts`, die drei neuen Zweige ersetzen:

```ts
if (!subdomain || !LEGAL_TYPES.includes(typeRaw as LegalType)) {
  throw createError({ statusCode: 400, statusMessage: 'subdomain and type required' })
}
```

Dazu die Tests: unbekannter `type` erwartet 400 und die Meldung `subdomain and type required`, nicht 404. Fehlender `type` erwartet dieselbe Meldung. Kein weiterer Umbau.

Wenn 404 ausdrücklich als neuer Vertrag freigegeben wird, ist keine Codeänderung nötig. Die Freigabe muss den Bruch gegenüber `main` benennen. Bis dahin ist der Branch bei Beanstandung 6 nicht vertragsgleich.

Unverändert lassen, das ist kein Statusbruch: unbekannte Website, unveröffentlicht ohne Token und fehlender Tenant bleiben 404. Das Entfernen von `tenantError.message` ist eine Engerfassung der Fehlertexte, kein Wechsel der Statuszahl.

## 7. Live-HTTP und Deployment

Keine Authentifizierung geändert. Nur GET.

### SIMY, `app.simy.ch`

Kein Redirect. Server `Vercel`.

| URL | Status | Inhalt, ohne Personendaten |
| --- | --- | --- |
| `/api/public/website/fahrschule-sara/legal?type=impressum` | 500 | JSON, 192 Bytes: `error: true`, `statusCode: 500`, `statusMessage` und `message`: `Server Error`. Das Wort Impressum steht nur in der Request-URL, nicht als Rechtstext. |
| `.../legal?type=datenschutz` | 500 | dieselbe Form, 194 Bytes |
| `.../legal` ohne `type` | 500 | dieselbe Form, 177 Bytes |
| `.../legal?type=nope` | 500 | dieselbe Form, 187 Bytes |
| `/api/public/website/fahrschule-sara` | 200 | JSON mit `landing`, `nav`, `page`, `tenant`, `website`. Kontrollaufruf, der den Sanitizer nicht importiert. Werte nicht kopiert. |
| `/s/fahrschule-sara/impressum` | 200 | Titel `Impressum \| fahrschule-sara`. H1 `Nicht gefunden`. Eingebetteter API-Fehler 500 `Server Error`. Neue 5xx-Überschrift fehlt. |
| `/s/fahrschule-sara/datenschutz` | 200 | Titel `Datenschutz \| fahrschule-sara`. H1 `Nicht gefunden`. Dieselbe API-500-Stelle. |

In diesen Bodies keine SHA `94f07a83`, `c795ba04`, `57543d57` oder `f1efbe6d`, kein Stack, kein `isomorphic-dompurify`, kein `jsdom`.

### Deployment

GitHub-Deployment `Production – simy-app`, erstellt 2026-10-16T11:45:24Z, Ref/SHA `57543d57dd27b9ceabd84894cc74a1123fdb45dd`. Commit-Status `Vercel – simy-app` für diesen SHA: `success`.

In 8239 gelesenen Deployment-Einträgen kein Treffer auf `94f07a83`, `c795ba04` oder den Branch-Ref `cursor/legal-pages-http-500-adc4`.

Damit liefert `app.simy.ch` den Fix nicht aus. Die Übereinstimmung ist: Production-SHA ist `main`, `main` enthält den Fix nicht, und das Live-HTML enthält die neue Fehlerüberschrift nicht.

### `fahrschule-sara.ch`

`https://www.fahrschule-sara.ch/impressum` und `/datenschutz`: HTTP 200, Server `cloudflare`, Titel `IMPRESSUM | FAHRSCHULE Sara` bzw. `DATENSCHUTZ | FAHRSCHULE Sara`, H1 `IMPRESSUM` bzw. `DATENSCHUTZ`. Das ist nicht die SIMY-App und nicht dieser Branch. Wix bleibt die öffentliche Domain. Kein Cutover geprüft oder ausgelöst. Rechtliche Vollständigkeit dieser Texte wurde nicht geprüft.

## 8. Nächste Schritte, in dieser Reihenfolge

1. Entscheiden, ob unbekannter `type` und leerer Subdomain-Parameter bei 400 `subdomain and type required` bleiben oder ob 404 als neuer Vertrag gilt. Bis dahin den Korrekturvorschlag nicht anwenden und keinen PR öffnen.
2. Falls 400 gilt: nur die oben genannte Verzweigung und die beiden Tests ändern. Sonst den 404-Entscheid schriftlich festhalten.
3. Einen PR gegen `main` erst mit separater Freigabe öffnen. Nicht mergen, nicht deployen, kein Auto-Merge.
4. Nach einem menschlichen Merge die Production-SHA lesen. Sie muss den Legal-Fix enthalten. Der heutige Production-SHA `57543d57` genügt nicht.
5. Danach dieselben vier GETs wiederholen: Impressum-API, Datenschutz-API, `/s/fahrschule-sara/impressum`, `/s/fahrschule-sara/datenschutz`. Erfolg ist HTTP 200 der API mit Rechtstext-HTML und ein H1, das nicht `Nicht gefunden` ist. Fehlender `type` darf nicht mehr ein generischer 500 sein. Ist er das noch, ist die DOMPurify-Hypothese für Production widerlegt. Stoppen, nicht weiterbauen.
6. `www.fahrschule-sara.ch` nicht umschwenken.

## 9. Was diese Prüfung nicht getan hat

Keine Datei ausser diesem Bericht geschrieben. Kein Commit, kein Push, kein PR, keine Draft-Änderung, kein Merge, kein Workflow-Dispatch, kein Deployment, keine Migration, kein SQL, keine Secret-, DNS-, Vercel-Domain- oder Tenant-Änderung.

## 10. Tatsachen, frühere Berichte, Annahmen

**Selbst verifiziert:** SHAs, Merge-Base, Diff, alter und neuer Handler, Sanitizer-Quelltext, Vue-Routen, 30 Unit-Tests, ESLint der vier Testdateien, die Live-Statuscodes und die kurzen Fehlerbodies, der Production-Deployment-SHA `57543d57`, das Fehlen der Fix-SHAs in den gelesenen Deployments, die Wix-Titel auf `www.fahrschule-sara.ch`.

**Frühere Berichte, hier nicht als neuer Beweis verwendet:** Gate-HTTP-Tabelle vom selben Tag, Implementierungs-Handoff mit 24 Tests, die Aussage, DOMPurify sei die Ursache. Der Live-500 heute passt zu jener Tabelle. Er beweist die Ursache nicht.

**Offen:** der Produktions-Exceptionstext; ob der Nitro-Build `createRequire` wirklich verzögert; ob nach einem späteren Deploy die Seiten 200 liefern; die menschliche Wahl zwischen 400 und 404.

Die Wahl ist danach getroffen worden: der Vertrag von `main` bleibt 400/400. Siehe Nachtrag. Die anderen drei Punkte bleiben offen.

## Nachtrag — Review, Vertrag, PR

Zeitpunkt: 2026-10-16, nach 12:06 UTC. Dieser Nachtrag ist eine neue Prüfung plus die freigegebene Vertragskorrektur. Er überschreibt den 12:02-Befund nicht.

### Branches

Nach `git fetch` am selben Tag:

| | SHA |
| --- | --- |
| `origin/main` | `57543d57dd27b9ceabd84894cc74a1123fdb45dd` |
| Merge-Base beider Branches mit `main` | `57543d57dd27b9ceabd84894cc74a1123fdb45dd` |
| `cursor/legal-pages-http-500-adc4` vor der Korrektur | `c795ba04bd12f5c5ae23e6647e5342b46a3f9530` |
| Produkt-Commit dieses Branches | `94f07a8396415de74a50880422de6d5c9b6273d2` |
| `cursor/legal-pages-http-500-5594` | `b828e8de786b9ffbf930abe2f0a44ff0fdcb67ed` |
| Produkt-Commit von 5594 | `3f20e106` (Message: keep legal pages available if HTML sanitizing fails to start) |

`main` hatte gegenüber keinem der beiden Branches weitere Commits. Die Branches sind Geschwister, keiner enthält den anderen.

### Vergleich

`adc4` ist der kanonische Branch.

- Sanitizer-Fehler liefern dort nie den Eingabestring. Andere Aufrufer bekommen `''`. Datenschutz fällt auf den escapten Generatortext zurück.
- Die HTML-Seiten unterscheiden eine 5xx von „Nicht gefunden“.
- Tests fahren DOMPurify real, ausser im gezielten Loader-Ersatz.

`5594` ist nicht übernommen und nicht gemergt.

- Unbekannter `type` ist dort ebenfalls 404, nicht der Vertrag von `main`.
- `sanitizeTenantHtml` wirft bei einem Ladefehler die Original-Exception weiter. Andere Seiten hätten diesen Text sehen können.
- Ein Reglement, dessen Sanitization wirft, endet als HTTP 500 statt als Generatortext.
- Die Tests mocken `sanitizeTenantHtml` und lassen es standardmässig den Input zurückgeben. Das ist kein realer DOMPurify-Lauf.
- Die Vue-Fehlerüberschrift fehlt.

### Vertrag

Fehlender `type`, unbekannter `type` und leerer Subdomain-Parameter sind wieder HTTP 400 `subdomain and type required`. Das ist der Handler auf `origin/main`. Es gibt keinen dokumentierten, genehmigten Wechsel auf 404. Die Korrektur liegt in `3f4f4642313d1f5fc8271dd68b3306775537acdb`.

Zusätzlich verworfen wird Reglement-HTML, wenn der Sanitizer wirft oder das Ergebnis noch `script`, Event-Handler oder `javascript:` enthält. Dann gilt der escapte Generatortext.

### Endstand des Codes

| | SHA |
| --- | --- |
| Kanonischer Branch | `cursor/legal-pages-http-500-adc4` |
| Vertragskorrektur | `3f4f4642313d1f5fc8271dd68b3306775537acdb` |
| Hinweis im alten Handoff | `68496e809587cd06c4fba21651dab348c48aa1b0` |
| `origin/main` und Merge-Base | `57543d57dd27b9ceabd84894cc74a1123fdb45dd` |
| Merge | `git merge origin/main` meldete „Already up to date.“ Kein Rebase, kein leerer Merge-Commit. |

Dieser Nachtrag wird danach als eigener Commit auf denselben Branch gelegt. Dessen SHA ist der PR-HEAD nach dem Push. Parent ist `68496e80`.

### Tests auf `3f4f4642`

Unit-Tests. Supabase ist ein Double. Kein Produktionsaufruf. DOMPurify läuft in den Erfolgs- und P1-Tests real. Der Fallback-Test ersetzt den Loader.

```
npx vitest run \
  server/utils/__tests__/website-legal-pages.http.test.ts \
  server/utils/__tests__/website-legal-sanitizer-fallback.http.test.ts \
  server/utils/__tests__/p1-upload-vhtml-hours.test.ts \
  server/utils/__tests__/website-public-security.test.ts
```

Start 12:09:31, Exit 0.

```
Test Files  4 passed (4)
Tests       35 passed (35)
```

16 Handler, 6 Sanitizer-Fallback, 7 P1, 6 Public-Security.

```
npx eslint "server/utils/__tests__/**/*.ts" --max-warnings 0
```

Exit 0. Das ist `npm run lint`.

Nicht ausgeführt: volles `npm test`, Playwright, Dependency Review, Typecheck, Production-Build. Die älteren Zahlen 21, 24 und 30 gehören zu anderen Ständen und gelten hier nicht.

Diff gegen `main` vor diesem Nachtrag, nur diese Pfade: Legal-Handler, Sanitizer, beide Vue-Seiten, drei Testdateien, der PR-1-Handoff. Keine Migration, keine Sara-Konfiguration, kein Wix.

### PR

Draft: https://github.com/Kilchi555/driving-team-app/pull/457

Nicht undraften, nicht mergen. CI auf dem endgültigen HEAD wird nach dem Push dieses Nachtrags erwartet. Das Ergebnis steht hier noch nicht.

### Weiterhin offen

- Erforderliche Checks auf dem PR-HEAD: Test and lint, E2E login, Dependency Review.
- Live-API und HTML-Routen auf `app.simy.ch` sind erst nach menschlichem Merge und Deployment neu zu lesen. Der 12:02-Befund bleibt der letzte Live-Nachweis: HTTP 500 und „Nicht gefunden“.
- Produktions-Exception und Nitro-Bundle bleiben unbewiesen.
- `www.fahrschule-sara.ch` bleibt Wix.

### Nächste Schritte

1. Erforderliche CI auf PR 457 abwarten. Rot heisst korrigieren, nicht mergen.
2. Ein Mensch entscheidet den Merge. Kein Auto-Merge.
3. Danach die Production-SHA lesen. Sie muss diesen Branch enthalten. `57543d57` genügt nicht.
4. Erst dann die vier GETs wiederholen: Impressum-API, Datenschutz-API, `/s/fahrschule-sara/impressum`, `/s/fahrschule-sara/datenschutz`.
5. `www.fahrschule-sara.ch` nicht umschwenken.
