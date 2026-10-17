# SIMY — Website-Generator: Öffnungszeiten, GBP und Team-Profile

**Abschlussstatus:** `AUDIT COMPLETE — AWAITING IMPLEMENTATION APPROVAL`

Beobachtet: 2026-10-17. Repository `Kilchi555/driving-team-app`. Geprüft gegen `origin/main` `76c0a5b4` (`fix(invoices): validate company before create side effects (#466)`).

`.cursor/rules/agent-handoff.mdc` ist auf `main` nicht vorhanden. Draft PR #432 schlägt das Protokoll vor und ist nicht gemergt.

Keine Anwendungscode-Änderung. Keine Migration. Kein Merge. Keine Produktionsdaten und keine Produktionskonfiguration geändert. Einzige Produktionsabfrage: Spaltennamen von `users`, `staff_working_hours` und `staff_locations`. Keine Personen- oder Öffnungszeitwerte gelesen. Kein Google-API-Aufruf.

## 1. Ist-Zustand

Der Website-Generator hat keine bestätigten öffentlichen Betriebsöffnungszeiten und kein öffentliches Mitarbeiterprofil ausser Name, Rolle, Foto, Sprachen und Kategorien.

Öffentliche Seiten laufen über `GET /api/public/website/:subdomain` und `enrichLandingPremium` in `server/utils/website-enrich-landing.ts`. Sichtbares HTML steht in `pages/s/[subdomain]/index.vue` und `pages/s/[subdomain]/[slug].vue`. Der Editor ist `pages/admin/website/editor.vue` plus `components/website/WebsiteEditorMore.vue`.

`staff_working_hours` wird vom Website-Enrichment nicht gelesen. Die Tabelle speist Buchung und Verfügbarkeit, nicht die öffentliche Website.

## 2. Öffnungszeiten heute

### Quelle

| Daten | Bedeutung im Code | Website |
|---|---|---|
| `tenants.working_days_template` | Ein Start und ein Ende pro Wochentag. Geschrieben bei der Registrierung in `server/api/tenants/register.post.ts`. Kein späterer Editor gefunden. Dient auch als Vorlage für die ersten `staff_working_hours` neuer Mitarbeiter. | Wird als Betriebsöffnungszeit behandelt. |
| Branchenvorlage in `utils/workingDaysTemplate.ts` | `getWorkingDaysTemplateDefaults`. Für `driving_school`: Mo–Fr 07:00–19:00, Sa 08:00–16:00. | Wird veröffentlicht, wenn das Tenant-Template fehlt oder ungültig ist. |
| `staff_working_hours` | Mehrere Zeilen pro Tag sind möglich (`save_day` in `server/api/staff/working-hours.post.ts`). Spalten: `day_of_week`, `start_time`, `end_time`, `timezone`. | Nicht verwendet. |
| GBP `regularHours` | Live-Lesen im GBP-Profiltab. | Nicht verwendet. |

`resolveWorkingTemplate` in `server/utils/website-premium.ts` ruft immer `getWorkingDaysTemplateDefaults` auf. Ein fehlendes Template wird damit durch die Branchenvorlage ersetzt.

`formatOpeningHours` erzeugt genau ein Intervall pro Tag. Geschlossen heisst: der Tag fehlt in `days`, Anzeige `Geschlossen`. „Nach Absprache“ existiert nicht.

`openingHoursToSchema` schreibt ein `OpeningHoursSpecification` pro offenem Tag. Geschlossene Tage fehlen im JSON-LD. Mehrere Intervalle und Sondertage kann das Format nicht ausdrücken.

### Wo sie erscheinen

1. Builder: `buildLandingPage` setzt `contact.hours` aus dem Template (`website-landing-builder.ts`, etwa Zeile 351–354 und 610–611). `verified_hours_only` unterdrückt die Vorlage nur, wenn dieses Flag gesetzt ist. Das Flag setzt heute der Prospect-Cron (`website-prospect-generate.ts`), nicht die normale Tenant-Website.
2. Jeder öffentliche Aufruf: `enrichLandingPremium` überschreibt `c.hours` mit `formatOpeningHours(resolveWorkingTemplate(tenant))` (etwa Zeile 391–406) und setzt `openingHoursSpecification` im JSON-LD neu (etwa Zeile 623–625). Gespeicherte Blöcke mit alten Zeiten werden dabei ersetzt. Die Ersatzwerte können die Branchenvorlage sein.
3. Sichtbar nur wenn `block.content.hours` nicht leer ist (`index.vue` etwa Zeile 575–582). Die Überschrift lautet sonst nicht. Ein leeres Array erzeugt also keine Stundenliste.
4. SEO-Fliesstext in `website-local-seo.ts` enthält keine Uhrzeiten.

Ein späterer Datenwechsel entfernt alte Stunden aus der öffentlichen Antwort, sobald Enrichment läuft. Cache ist kurz (`s-maxage` 120 auf der öffentlichen Route). Solange Enrichment die Vorlage einsetzt, bleiben erfundene Zeiten sichtbar.

Der Website-Editor hat kein Feld für Öffnungszeiten. Publish (`server/api/website/publish.post.ts`) prüft Inhalt und Bezahlung, nicht eine Stunden-Bestätigung.

## 3. GBP

Vorhanden, unter Add-on `gbp_enabled` und Scope `https://www.googleapis.com/auth/business.manage`:

- OAuth, Standortwahl, Posts, Fotos, Review-Antworten.
- `getGbpLocationProfile` liest `regularHours` als ein oder mehrere Perioden (`server/utils/gbp.ts`, Maske `title,phoneNumbers,websiteUri,regularHours,categories,profile`).
- Der Profiltab kann diese Zeiten zurück nach Google schreiben. Die UI behält nur das letzte Intervall pro Wochentag.
- `specialHours`, Adresse und Geschäftsstatus werden nicht gelesen.
- Es gibt keinen Import nach `tenants` und keinen Abgleich mit der Website.

Ein Import der regulären Zeiten braucht keinen neuen Google-Scope. Sonderöffnungszeiten brauchen nur eine erweiterte `readMask` (`specialHours`) auf derselben API, ebenfalls ohne neuen Scope. Das ist Code, der heute fehlt, kein fehlendes OAuth-Recht.

GBP ist keine geprüfte Wahrheit. Ein Import darf nur ein Entwurf sein. Bestätigte manuelle Zeiten dürfen nicht von einem späteren Abruf ersetzt werden.

Der OAuth-Callback vertraut einem unsignierten `tenant_id` im `state`. Das ist in Draft PR #465 belegt. Ein GBP-Stundenimport soll erst ausgeliefert werden, wenn dieser Callback signiert und an die Admin-Session gebunden ist. Sonst kann eine falsche Google-Verbindung die vorgeschlagenen Zeiten liefern.

## 4. Staff-Profile

### Vorhanden

| Bedarf | Ist |
|---|---|
| Name | `users.first_name`, `users.last_name` |
| Aktiv | `users.is_active`. Enrichment lädt nur `is_active = true` und Rollen `staff`, `admin`, maximal 12. |
| Rolle | `users.profession`, sonst „Inhaber/in“ oder die Branchenbezeichnung. Im Editor überschreibbar als `role_label`. |
| Foto | `users.metadata.photo_url` oder `avatar_url`. Der Editor speichert ein zusätzliches Foto nur in der Website-Team-Liste. |
| Sprachen | Eine Sprache in `users.language`. Weitere Codes in `metadata.languages`. Anzeige als deutsche Namen. Kein Niveau. |
| Kategorien | `users.category` (Text-Array). Die Karte zeigt höchstens drei. |
| Standorte | `staff_locations` (`staff_id`, `location_id`, `tenant_id`, `is_active`). Wird auf der Website nicht angezeigt. |
| Arbeitszeiten | `staff_working_hours`, mehrere Blöcke pro Tag, mit Zeitzone. Nicht öffentlich. |
| Sichtbarkeit auf der Website | `WizardTeamMember.visible` in `website_team` / Wizard-Draft. `resolveWebsiteTeam` blendet `visible === false` aus und ergänzt neue aktive Mitarbeiter. |
| Sortierung, Kurztext, Biografie, Qualifikationen, Einsatzgebiete, Schwerpunkte, öffentliche Arbeitszeiten | Fehlen. |

Der Team-Editor (`WebsiteEditorMore.vue`, Panel `team`) kann Name, Rollenzeile, Foto und Sichtbarkeit pflegen und eine freie Person ohne Staff-Konto anlegen. Er kann keine Sprachen, Kategorien, Orte oder Texte setzen. Sprachen und Kategorien kommen live aus `users` und überschreiben die gespeicherte Teamkarte (`resolveWebsiteTeam` spreadet `live` und setzt danach nur Name, Rolle und Foto).

Inaktive Mitarbeiter werden nicht geladen. Platzhalternamen (`Max Muster` und ähnliche) werden ausgeblendet.

JSON-LD enthält kein `Person`-Objekt für das Team. Reviews nutzen `Person` nur als Autorenname.

Es gibt keine zweite öffentliche Arbeitszeitquelle. Die operative Tabelle soll die einzige bleiben.

## 5. Offene PRs

Keiner dieser PRs baut bestätigte Betriebszeiten oder erweiterte Team-Profile. Keiner wird von diesem Audit verändert.

| PR | Status | Bezug | Empfehlung |
|---|---|---|---|
| #465 | Draft, Docs | GBP-Konsistenz-Audit, inklusive unsigniertem OAuth-State | Lesen vor einem GBP-Import. Nicht als Implementierungsbasis verwenden. |
| #468 | Draft, mergeable | Navbar und Hash-Sprünge. Ändert `pages/s/[subdomain]/index.vue` und `[slug].vue`. | Zuerst mergen oder die Stunden- und Team-PRs danach rebasen. Dieselben Vue-Dateien. |
| #458 | Draft | Custom Domain erst mit lebendem Zertifikat. Ändert öffentliche Website-Routen und SEO-Kontext. | Unabhängig von den Stunden. Nicht in denselben PR mischen. |
| #450 | Draft | Prospect-Preview und „keine erfundenen Fakten“. Ändert `website-prospect-generate.ts`. | Stunden-Fix für echte Tenant-Seiten nicht in #450 legen. Prospect-Flag `verified_hours_only` später nur anfassen, wenn #450 gemergt oder verworfen ist. |
| #249, #251, #261 | Drafts, September | Preview-Gate, Publish, Revisionen. Überlappen öffentliche GET- und Publish-Dateien. | Nicht erweitern. Sie sind hinter `main`. Neue Arbeit von `origin/main`. |
| #436, #438 | Drafts | Website-Entitlement, Durchsetzung nicht verdrahtet. | Unabhängig. Nicht blockierend. |
| #37 | Draft, Docs | GBP-Foto/Review-Runbook | Kein Datenmodell. |
| #432 | Draft | Handoff-Protokoll | Nicht vorhanden auf `main`. |

Reihenfolge für die neue Arbeit: #468 beobachten, dann PR A (Stunden, ohne erfundene Zeiten), dann der OAuth-Fix aus dem #465-Plan, dann PR B (GBP-Entwurf), parallel oder danach PR C (Team), jeweils von aktuellem `main` und ohne die genannten Drafts zu überschreiben.

## 6. Zielarchitektur

Eine neue öffentliche Stundenquelle. `working_days_template` bleibt die Vorlage für neue Mitarbeiter-Arbeitszeiten und wird von der Website nicht mehr gelesen.

Vorschlag, eine JSONB-Spalte `tenants.public_opening_hours`, keine zweite Stundentabelle:

```json
{
  "timezone": "Europe/Zurich",
  "confirmation": "unconfirmed",
  "source": "manual",
  "confirmed_at": null,
  "confirmed_by": null,
  "gbp": {
    "location_id": null,
    "imported_at": null,
    "proposal": null
  },
  "week": {
    "1": { "state": "open", "intervals": [{ "start": "09:00", "end": "12:00" }, { "start": "13:00", "end": "17:00" }] },
    "2": { "state": "by_appointment", "intervals": [] },
    "7": { "state": "closed", "intervals": [] }
  },
  "special": []
}
```

`state` ist `open`, `closed` oder `by_appointment`. Intervalle nur bei `open`. Überlappungen und `end <= start` werden serverseitig abgelehnt. Zeitzone ist Wanduhr plus `tenants.timezone`, ohne UTC-Umrechnung. Sommerzeit verschiebt diese lokalen Intervalle nicht.

Regeln:

- `confirmation !== "confirmed"`: Website und JSON-LD enthalten keine Uhrzeiten und keinen Satz, der Zeiten behauptet. Die Kontaktzeile bleibt.
- Bestätigen ist eine eigene Aktion, nicht das blosse Speichern eines Entwurfs.
- GBP-Lesen füllt nur `gbp.proposal`. Übernehmen kopiert den Vorschlag in `week` und setzt `source` auf `gbp`, lässt `confirmation` auf `unconfirmed`, bis der Admin bestätigt.
- Ist `source = manual` und `confirmation = confirmed`, überschreibt ein neuer Import nur `gbp.proposal`. Die Wochenzeiten bleiben.
- `staff_working_hours` wird in dieser Spalte nie gelesen oder geschrieben.
- `working_days_template` wird durch das Speichern der öffentlichen Zeiten nicht verändert.

Sonderdaten (`special`) kommen in einem zweiten Schritt. Dafür `specialHours` in die bestehende Read-Maske aufnehmen. Bis dahin bleibt `special` leer und wird nicht erfunden.

### Team

Operative Daten bleiben, wo sie sind:

- Kategorien: `users.category`
- Standorte: `staff_locations` → `locations`
- Arbeitszeiten: `staff_working_hours`

Redaktionelle Website-Daten in einer Zeile pro Mitarbeiter, `staff_website_profiles`:

- `tenant_id`, `user_id` eindeutig
- `short_text`, `bio`
- `sort_order`
- `languages`: Liste `{ code, level? }` aus einer festen Sprachliste. Niveau optional und leer ausblendbar.
- `public_categories`: Teilmenge der echten Kategorien, nicht eine freie Erfindung. Leer bedeutet: die operativen `users.category` anzeigen.
- `qualifications`, `focus`: nur Werte aus serverseitigen Allowlists.
- `service_areas`: freie Ortsnamen, getrennt von `staff_locations`.
- `show_hours`: Standard false.

Öffentliche Arbeitszeiten werden nur gerendert, wenn `show_hours` true ist, und mit einer eigenen Beschriftung („Zeiten von …“), nie als Betriebsöffnungszeit.

Der bestehende Team-Editor bleibt der Ort der Pflege. Er schreibt das Profil und die Sichtbarkeit. Freie Team-Personen ohne `users`-Zeile behalten nur Name, Rolle und Foto. Sie bekommen keine erfundenen Sprachen oder Kategorien.

Die generative Bearbeitung darf nur gelieferte Felder umformulieren. Fehlende Felder bleiben leer. Leere Felder erzeugen keine Überschrift.

## 7. Implementierungsplan

Keine dieser PRs wird ohne Freigabe geöffnet. Migrationen bleiben im Draft und werden nicht auf Produktion angewendet.

### PR A — Bestätigte Betriebszeiten

Abhängigkeit: von `main` nach #468, falls #468 die öffentlichen Vue-Dateien noch offen hat.

- Spalte `tenants.public_opening_hours` plus RLS, die nur den eigenen Tenant schreibt. Service-Role-Routen filtern `tenant_id`.
- Admin-API: lesen, Entwurf speichern, bestätigen. Rolle Admin. Validierung der Intervalle.
- Editor-Panel im Website-Generator: Wochentage, mehrere Intervalle, geschlossen, nach Absprache, Button „Veröffentlichen bestätigen“.
- `enrichLandingPremium` und `buildLandingPage` lesen nur den bestätigten Wert. Sonst `hours: []` und kein `openingHoursSpecification`.
- `working_days_template` und `staff_working_hours` unangetastet.
- Tests 1, 2, 4, 5, 11, 13.

### PR B — GBP als Entwurf

Abhängigkeit: PR A und der signierte OAuth-State. Ohne den State-Fix kein Import in Produktion.

- `GET` der bestehenden `regularHours` für eine bereits verknüpfte `gbp_locations`-Zeile des eigenen Tenants.
- Speichern als `gbp.proposal` mit Zeitpunkt und Standort-ID.
- Admin sieht Übernehmen, Anpassen, Verwerfen.
- Ein späterer Import ersetzt keine bestätigte manuelle Woche.
- Kein Cron. Kein Schreiben nach Google in diesem PR.
- Test 3 und Tenant-Isolation.

### PR C — Öffentliche Team-Profile

Abhängigkeit: PR A, damit `index.vue` nicht parallel an zwei Stellen divergiert. Inhaltlich unabhängig von GBP.

- Tabelle `staff_website_profiles`, tenant-isoliert.
- Editor erweitert das bestehende Team-Panel. Kategorien und Standorte sind Mehrfachauswahl aus den echten Daten. Einsatzgebiete, Sprachen, Schwerpunkte und Texte sind redaktionell und optional.
- `show_hours` liest `staff_working_hours` nur für die Anzeige.
- Renderer und optionales `Person`-JSON-LD nur mit vorhandenen Feldern.
- Inaktive `users` bleiben unsichtbar.
- Tests 6–12.

## 8. Risiken

- Sicherheit: GBP-Import und Stunden-API müssen `requireAdminOnly` nutzen. Der unsignierte OAuth-Callback bleibt offen, bis der separate Fix da ist.
- Datenschutz: Biografie, Foto und öffentliche Arbeitszeiten sind personenbezogen. `show_hours` ist standardmässig aus. Interne IDs gehören nicht in die öffentliche JSON-Antwort; die Teamkarte nutzt heute die User-UUID als `id`. Die öffentliche Antwort soll eine stabile, nicht operative ID oder gar keine ID ausser dem Vornamen-Schlüssel verwenden. Das ist eine bewusste Änderung und muss geprüft werden, damit Vue-Keys nicht kollidieren.
- Daten: Bestehende Websites verlieren die heute angezeigten Vorlage-Zeiten, sobald PR A live ist und nichts bestätigt wurde. Das ist beabsichtigt. Vor dem Schalten braucht es eine kurze Admin-Hinweiszeile, keine stillen Ersatzzeiten.
- `working_days_template` darf nicht mit den neuen Zeiten überschrieben werden, sonst ändern sich die Standard-Arbeitszeiten neuer Mitarbeiter.
- SEO: Wegfall von `openingHoursSpecification` bei unbestätigten Zeiten ist korrekt. Erfundene Zeiten im Markup sind das grössere Risiko. Reich-Resultate werden nicht versprochen.
- Konflikt mit #468 und #458 in denselben Vue- und Public-Routen.
- Bereits generierte Blöcke: Enrichment muss Stunden aktiv leeren, nicht nur beim Neubau weglassen. Sonst bleibt eine alte Liste stehen, wenn der Contact-Block schon `hours` enthält und der neue Code den Zweig überspringt.

## 9. Definition of Done

1. Ohne `confirmation = confirmed` zeigt die öffentliche Seite keine Uhrzeiten und kein `openingHoursSpecification`.
2. Mitarbeiterzeiten 08:00–17:00 und Betrieb 09:00–12:00 plus 13:00–17:00: die Seite zeigt nur die bestätigten Betriebsintervalle.
3. Ein GBP-Vorschlag mit anderen Zeiten lässt bestätigte manuelle Zeiten unverändert.
4. Zwei Intervalle an einem Tag erscheinen in der Liste und als zwei `OpeningHoursSpecification` mit demselben `dayOfWeek`.
5. `closed` zeigt „Geschlossen“ und kein Schema-Intervall. `by_appointment` zeigt „Nach Absprache“ und kein Schema-Intervall.
6. `show_hours = false`: keine Mitarbeiterzeiten im HTML.
7. Sprachen, Kategorien, Standorte und Schwerpunkte überleben Speichern, Laden und Rendern und stammen nur aus der Eingabe.
8. Leere optionale Felder erzeugen keine leere Überschrift.
9. `is_active = false` erscheint nicht im Team.
10. Tenant A kann Stunden und Profile von Tenant B nicht lesen oder schreiben.
11. Eine bestehende Website ohne die neuen Felder rendert weiter. Stunden fehlen, bis sie bestätigt sind. Team zeigt weiterhin Name, Rolle, Foto, Sprachen und Kategorien.
12. Entwurf, Bestätigung, Preview und Publish unterscheiden `unconfirmed` und `confirmed`. Regenerieren erfindet keine Zeiten.
13. Sichtbare Stunden und JSON-LD beschreiben dieselben Intervalle.

## 10. Nächster Schritt

Ein Mensch gibt PR A frei oder lehnt ihn ab. Vorher kein Code, keine Migrationsdatei und kein Apply auf der Datenbank.

Produktions- und Google-Schreibzugriffe haben in diesem Audit nicht stattgefunden.
