# Root-Cause-Bericht: Theorielektionen speichern im EventModal

**Priorität:** Hoch  
**Modus:** Root-Cause-Analyse (read-only)  
**Branch/HEAD zum Untersuchungszeitpunkt:** `main` @ `0770ad2e53168ff01f7c45e575eee8c1566329c5`  
**Status:** Kein Fix implementiert — Freigabe ausstehend

---

## A. VERDICT

**ROOT CAUSE LIKELY**

Primäre Ursache mit hoher Code-Evidenz: Server-seitiges Fail-Closed beim Speichern (`NO_PRICE_RULE`), während das Frontend Theorie weiterhin mit Fallback-Preis speicherbar erscheinen lässt. Screenshot und Live-Tenant-Reproduktion fehlen noch für **CONFIRMED**.

---

## B. Screenshot-Befund

**Kein Screenshot im Agent-Kontext vorhanden** (weder im Store, noch als Attachment, noch in der Message-Queue). Die Aussage „wird zusätzlich angehängt“ war zum Untersuchungszeitpunkt nicht eingelöst.

Deshalb **nicht belegt**:

- Fehlermeldung / Toast-Text
- ob „Speichern“ disabled, loading oder klickbar war
- gewählte Kategorie, Terminart, Preis
- Create vs. Edit

**Aus dem Code abgeleitetes erwartetes UI** (`components/EventModal.vue`): Terminart-Dropdown inkl. Theorie, Kategorie, Dauer, Zeit, Ort, Speichern-Button → `handleSaveAppointment`.

---

## C. Tatsächlicher Datenfluss

```
UI EventModal.vue
  → Speichern @click → handleSaveAppointment (~Z. 1762)
  → saveAppointment() in useEventModalForm.ts (~Z. 859)
  → POST /api/appointments/save
       (appointmentData.event_type_code = 'theory', type = Kategorie)
  → quoteStaffAppointmentOffer()          (quote-staff-appointment.ts ~Z. 80)
  → resolveOfferPrice(ruleTypeHint: 'theory')  (resolve-offer-price.ts ~Z. 252)
  → pricing_rules WHERE rule_type='theory' AND category_code=...
  → bei Treffer: INSERT/UPDATE appointments + payments
  → bei Miss: throwIfUnpriced → HTTP 503 NO_PRICE_RULE → kein DB-Write
  → Frontend showError(...) → Modal bleibt offen
```

| Schritt | Datei / Funktion | Relevanz |
|---|---|---|
| Terminart Theorie | `LessonTypeSelector.vue` → `handleLessonTypeSelected` | setzt `appointment_type='theory'`, `eventType` bleibt `'lesson'` |
| Validierung / Button | `isFormValid` / `isFormValidWithManualInput` | Button ist an Formularfelder gebunden, **nicht** an Server-Preisregel |
| Payload | `useEventModalForm.saveAppointment` | sendet `event_type_code` + `type` (Kategorie) |
| Server-Quote | `save.post.ts` ~Z. 230 vor jedem Write | **blockiert** bei fehlender Theory-Regel |
| Persistenz | `appointments` + `payments` | nur wenn Quote `paid`/`free` |

### UI-Details (EventModal)

- Speichern-Button: `components/EventModal.vue` ~Z. 581–596, Handler `handleSaveAppointment`
- Theorie-Auswahl: `handleLessonTypeSelected` setzt `formData.appointment_type = lessonType.code` (~Z. 4369+)
- Dauer für Theorie: `loadTheoryDurations` / `theory_durations` aus Kategorien
- Geplante Themen: `savePlannedTopics` nur nach erfolgreichem Appointment-Save (non-critical)

---

## D. Fehlerursache

### Bestätigt (Code)

1. Seit `#218` (`732ccda0`) speichert Staff **keine Client-Preise** mehr. Der Server quotiert vor dem Write und **fail-closed** bei fehlender Paid-Regel.

2. Für Theorie gilt `staffRuleTypeHint('theory') → 'theory'`. Es wird **nur** `pricing_rules.rule_type = 'theory'` für die gewählte Kategorie gesucht.

3. Für **Exam** gibt es seit `39e79b5d` einen Fallback auf `base_price`. Für **Theory gibt es keinen analogen Fallback**.

4. Frontend (`composables/usePricing.ts` ~Z. 521–558) zeigt bei fehlender Theory-Regel weiterhin **Fallback 85 CHF/45min** und lässt Speichern zu.

5. `LessonTypeSelector` zeigt „Theorie“, sobald **irgendeine** Kategorie Theory-Pricing hat (`hasTheoryPricing`). `CategorySelector` filtert **nicht** auf theory-fähige Kategorien. Ergebnis: Theorie + Kategorie ohne Theory-Regel ist UI-seitig möglich → Save schlägt serverseitig fehl.

Das erklärt „nicht zuverlässig“: funktioniert nur, wenn für die **konkrete** Kategorie eine aktive `rule_type='theory'`-Zeile existiert.

### Hypothesen (nicht bestätigt ohne Screenshot/Tenant)

- Speichern-Button disabled (fehlender Ort/Schüler/Kategorie)
- FK auf fehlendem `event_types.code='theory'`
- reines Reload-/Anzeigeproblem nach erfolgreichem Save

Diese Pfade sind sekundär; der Fail-Closed-Pfad ist der stärkste Match.

---

## E. Beweise

| Nachweis | Inhalt |
|---|---|
| `server/utils/resolve-offer-price.ts` 311–328 | Theory ohne Rule → `unpriced` / `NO_PRICE_RULE`; Exam hat Fallback, Theory nicht |
| `server/utils/quote-staff-appointment.ts` 56–61, 92 | Hint `theory`; `throwIfUnpriced` |
| `server/api/appointments/save.post.ts` 230–239 | Quote **vor** Insert/Update |
| `composables/usePricing.ts` 547–552 | Client-Fallback 85 CHF |
| `components/LessonTypeSelector.vue` 77–83 | Theory global gated, nicht pro Kategorie |
| Git | `#218` Fail-Closed; Exam-Fallback später; Theory nicht nachgezogen |
| Tests | Exam-Fallback und `NO_PRICE_RULE` abgedeckt; **kein** Theory-Miss-Test |
| Screenshot | **fehlt** |
| Runtime-Logs / Prod-Tenant | **nicht geprüft** (read-only, keine Prod-Daten) |
| Unit-Tests ausgeführt | Nein (lokales `vitest` im Env nicht installiert) |

### Zusätzlicher UX-Hinweis

In `useEventModalForm.ts` (~Z. 1134):

```ts
throw new Error(fetchError.data?.message || fetchError.message || '...')
```

Bei `createError({ statusMessage, data: { code: 'NO_PRICE_RULE' } })` ist `data.message` oft leer. Die deutsche `statusMessage` kann dadurch verloren gehen; der User sieht ggf. eine undeutliche ofetch-Meldung.

---

## F. Reproduktion

### Kleinste sichere Repro (ohne Prod-Write)

Mock-Unit-Test:

- `event_type_code='theory'`
- Kategorie mit nur `base_price`, keine `theory`-Rule
- Erwartung: `503` / `NO_PRICE_RULE`, `inserts.appointments.length === 0`

### Manuell in isoliertem Test-Tenant (nur wenn freigegeben)

1. Theory-Pricing nur für Kat. A aktivieren, nicht für B
2. EventModal → Schüler → Terminart Theorie → Kategorie B → Speichern
3. Erwartung UI: Preis sichtbar (Fallback)
4. Ist: Save scheitert, kein Termin; Toast/Fehler mit Preis-/503-Bezug

**Gegenprobe:** dieselbe Aktion mit Kat. A (Theory-Rule vorhanden) → Save ok.

---

## G. Fix-Vorschlag (noch nicht implementieren)

Minimal, ursachenbasiert — eine der Optionen:

1. **UI/Validierung (empfohlen zuerst):** Speichern blocken + klare Meldung, wenn Theory gewählt und Kategorie keine `theory`-Rule hat; optional Kategorien auf `theoryEnabledCategories` filtern.
2. **Kein Client-Fallback-Preis** für Theory ohne Rule (kein 85-CHF-Scheinpreis).
3. **Server:** nur falls fachlich gewollt — explizite Policy (nicht still auf Fahrstunden-`base_price` fallen). Exam-Fallback 1:1 für Theory ist fachlich riskant.

**Betroffene Dateien (erwartet):**

- `components/LessonTypeSelector.vue`
- `components/CategorySelector.vue` / `components/EventModal.vue`
- `composables/usePricing.ts`
- ggf. `server/utils/resolve-offer-price.ts`
- Tests unter `server/utils/__tests__/`

**Seiteneffekte:** Tenants ohne Theory-Rules können Theory nicht mehr „scheinbar“ speichern; bestehende Tenants mit korrekten Rules unverändert.

---

## H. Regressionstests

1. Theory + passende `theory`-Rule → Save schreibt Appointment + Payment
2. Theory + nur `base_price` → `NO_PRICE_RULE`, kein Write
3. Theory für Kategorie ohne Rule, aber andere Kategorie hat Rule → UI blockt oder Server rejected konsistent
4. Exam ohne Exam-Rule → weiterhin `base_price`-Fallback
5. Create und Edit Theory mit Rule
6. Frontend zeigt keinen Fake-85-Preis ohne Rule

**Isoliert ausführbar** (nach Dependency-Setup):

- `server/utils/__tests__/quote-staff-appointment.test.ts`
- `server/utils/__tests__/resolve-offer-price.test.ts`
- `server/utils/__tests__/staff-appointment-save-price.http.test.ts`

---

## I. Sicherheits- und Mandantenrisiken

- **Kein Cross-Tenant-Leak** im Fail-Closed-Pfad; Write unterbleibt.
- **Kein Datenverlust** durch Partial Write bei diesem Fehler.
- Risiko eher **Betriebs-/UX**: Staff denkt, Speichern geht (Preis sichtbar), Termin fehlt.
- Hardcodierter 85-CHF-Fallback im Client wäre bei gelockerter Server-Policy Preismanipulation — Server-Authorität hier korrekt.

---

## J. Nächster Schritt

**Screenshot nachreichen** (oder in isoliertem Test-Tenant den Network-Call auf `POST /api/appointments/save` bei Theorie speichern prüfen: Status 503 + `NO_PRICE_RULE`?).

Danach Freigabe für den minimalen Fix (UI-Block + Entfernen des Fake-Fallback-Preises; Server-Policy nur nach fachlicher Entscheidung).

---

## Hypothesen-Check (systematisch)

| # | Hypothese | Status |
|---|---|---|
| 1 | Button ohne Handler | Ausgeschlossen (`@click="handleSaveAppointment"`) |
| 2 | Formularvalidierung blockiert | Möglich, aber nicht primär |
| 3 | Payload ohne Theory | Unwahrscheinlich (`appointment_type`/`event_type_code`) |
| 4 | Create≠Update | Beide quoten vor Write |
| 5 | Falsche API-Route | Route korrekt (`POST /api/appointments/save`) |
| 6 | Server-Validierung lehnt ab | Ja — unpriced / `NO_PRICE_RULE` |
| 7 | DB Constraint/RLS | Nachgelagert; Fail vor Write |
| 8 | Falsche IDs / Kategorie | Kategorie ohne Theory-Rule = effektiver Trigger |
| 9 | Async nicht awaited | Save awaited |
| 10 | Fehler verschluckt | Fehler wird gezeigt; Message ggf. undeutlich |
| 11 | Nur Reload-Bug | Unlikely bei Fail-Closed ohne Write |
| 12 | Regression | Ja: `#218` + fehlender Theory-Fallback nach Exam-Fix |

---

## Relevante Git-Historie

| Commit | Relevanz |
|---|---|
| `732ccda0` (`#218`) | Staff-Save server-authoritative; missing paid rules fail closed |
| `39e79b5d` | Exam-Fallback auf `base_price` — Theory nicht nachgezogen |
| `9d059892` | Theory-Pricing aus Kategorie-Regeln + Sichtbarkeit gating |
| `2553d52a` / `d4532eae` | Frühere Theory-Preis-/Recalc-Fixes (Frontend) |

---

*Dokumentation der Untersuchung. Kein Produktionsfix. Implementierung nur nach Freigabe.*
