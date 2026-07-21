# Risikobewertung zur Meldepflicht (Art. 24 revDSG)

**Bezug:** [`2026-07-21_receipt-pdf-cross-customer-data-leak.md`](./2026-07-21_receipt-pdf-cross-customer-data-leak.md)
**Zweck dieses Dokuments:** Begründete, dokumentierte Einschätzung, ob die Verletzung der Datensicherheit vom 21.07.2026 (bzw. das seit Dez. 2025 bestehende strukturelle Problem) eine Meldepflicht an den EDÖB nach Art. 24 DSG auslöst.
**Erstellt am:** 21.07.2026
**Erstellt durch:** Pascal Kilchenmann, unterstützt durch KI-gestützte Analyse (Cursor Agent)
**Rechtlicher Hinweis:** Diese Bewertung ist **keine Rechtsberatung** und stellt keine verbindliche juristische Würdigung dar. Sie dient als strukturierte Tatsachen- und Argumentationsgrundlage. Die abschliessende rechtliche Beurteilung und Entscheidung über eine allfällige Meldepflicht sollte durch eine qualifizierte Datenschutz-/Rechtsberatung erfolgen und von dieser gegengezeichnet werden, bevor sie als offizielle Unternehmensposition gilt.

---

## 1. Rechtlicher Massstab

Art. 24 Abs. 1 DSG verlangt eine Meldung an den EDÖB nur, wenn eine Verletzung der Datensicherheit **"voraussichtlich zu einem hohen Risiko für die Persönlichkeit oder die Grundrechte der betroffenen Person führt"**. Es besteht – anders als unter der DSGVO – **keine generelle Meldepflicht für jede Datenschutzverletzung**. Die Einschätzung "hohes Risiko" ist eine Einzelfallbeurteilung anhand u. a. folgender Kriterien (herrschende Lehre/Praxis zu Art. 24 DSG):

- Art und Sensibilität der betroffenen Daten
- Anzahl betroffener Personen
- Wahrscheinlichkeit und Schwere eines möglichen Schadens (materiell, immateriell, Reputations-, Diskriminierungsrisiko etc.)
- Umkehrbarkeit / Dauer der Exposition
- Kontext und Umfeld der Datenweitergabe (z. B. geschlossener vs. öffentlicher Empfängerkreis)
- Getroffene Massnahmen zur Risikominderung nach Entdeckung

Zusätzlich ist unabhängig von der EDÖB-Meldepflicht zu prüfen, ob eine **Information der betroffenen Personen** nach Art. 24 Abs. 4 DSG angezeigt ist ("wenn es zu ihrem Schutz erforderlich ist").

---

## 2. Massgebliche Fakten (Referenz: Incident Report Abschnitte 4–6)

| Faktor | Befund |
|---|---|
| Betroffene Datenkategorien | Name, Adresse, Telefon, E-Mail, Zahlungsbetrag/-methode, Termin-/Lektionsdaten, Instruktorname; bei Bewertungs-PDFs zusätzlich Beurteilungstexte |
| Besonders schützenswerte Daten (Art. 5 lit. c DSG)? | Nein, mit Ausnahme möglicher Einzelformulierungen in Bewertungstexten (nicht systematisch geprüft) |
| Zeitraum des Problems | Dezember 2025 – 21.07.2026 (~7,5 Monate), technisch behoben seit 21.07.2026, 11:08 Uhr |
| Häufigkeit der Kollision | 45 von 79 kombinierten Quittungs-PDFs (57 %) am selben Tag überschrieben |
| Bestätigte tatsächliche Falscheinsicht durch Dritte | 1 Fall (Herr Ruedi Menzi) |
| Weitere gemeldete Fälle | Keine, trotz 7+ Monaten Laufzeit des Problems |
| Empfängerkreis bei Falscheinsicht | Ausschliesslich andere Kunden desselben Betriebs (kein Zugriff durch unbeteiligte Dritte/Öffentlichkeit nachgewiesen) |
| Vorsatz / externer Angriff | Nein – unbeabsichtigter Software-Fehler (Path-Collision-Bug) |
| Reaktionszeit nach Meldung | < 1 Stunde bis Root-Cause-Fix in Produktion; exponierte Datei am selben Tag gelöscht |
| Nachweisbarer Missbrauch der fremden Daten | Keiner bekannt |

---

## 3. Argumente gegen ein "hohes Risiko"

1. **Datensensibilität gering-mittel:** Keine besonders schützenswerten Personendaten (keine Gesundheits-, Straf-, biometrische oder Finanzkontodaten wie IBAN/Kartennummern). Die Kombination Name+Adresse+Zahlungsbetrag ist zwar personenbezogen, aber nicht in einer Kategorie, die typischerweise zu Identitätsdiebstahl oder unmittelbarem finanziellem Schaden führt.
2. **Kein systematischer Massenzugriff:** Es handelt sich um einzelne, zufällige Überschreibungen zwischen jeweils zwei Kunden desselben Betriebs – nicht um eine Datenbank-Exfiltration oder einen öffentlich indexierten Datenleck mit potenziell unbegrenztem Empfängerkreis.
3. **Geschlossener Empfängerkreis:** Soweit bekannt, haben ausschliesslich andere zahlende Kunden desselben Fahrschulbetriebs (nicht die allgemeine Öffentlichkeit oder böswillige Dritte) fremde Daten gesehen.
4. **Kein Vorsatz, keine Ausnutzung:** Es gibt keine Hinweise auf gezielten Missbrauch, Weiterverbreitung oder wirtschaftliche Ausnutzung der fremden Daten durch die betroffenen Kunden.
5. **Geringe tatsächliche Trefferquote:** Trotz 45 Kollisionsereignissen über 7+ Monate ist nur 1 Fall tatsächlicher Falscheinsicht bekannt/gemeldet worden. Das technische Zeitfenster für eine Falscheinsicht ist pro Kollision typischerweise sehr kurz (Sekunden bis Minuten).
6. **Vorbildliche, schnelle Reaktion:** Root Cause wurde innerhalb von Stunden nach Meldung identifiziert, behoben, verifiziert und die konkret exponierte Datei entfernt. Zusätzlich wurden präventive Massnahmen (automatische Löschung nach 48h) eingeführt, die das Risiko strukturell weiter reduzieren.

## 4. Argumente für ein "hohes Risiko" (müssen ebenso gewürdigt werden)

1. **Kein Einzelfall, sondern struktureller Dauerzustand:** 57 % Überschreibungsrate über mehr als 7 Monate zeigt ein wiederkehrendes, nicht ein singuläres Ereignis. Ein Regulator könnte dies als mangelnde Sorgfalt bei der ursprünglichen Implementierung werten.
2. **Tatsächlich eingetretener Schaden, nicht nur potenziell:** Der Risikotest bezieht sich auf das, was passiert ist – und es gibt einen bestätigten, tatsächlichen Fall. Das ist qualitativ etwas anderes als eine rein theoretische Schwachstelle ohne bekannten Vorfall.
3. **Dunkelziffer unbekannt:** Aus "keine weiteren Meldungen" folgt nicht "keine weiteren Vorfälle". Kunden könnten fremde Daten gesehen haben, ohne dies zu melden (z. B. weil sie es nicht als ungewöhnlich einordneten oder den Namen nicht kannten).
4. **Identifizierbarkeit und Kontext:** Innerhalb eines Fahrschulbetriebs kennen sich Kunden ggf. nicht, aber der Zahlungsbetrag verrät indirekt Informationen (z. B. Anzahl/Umfang gebuchter Lektionen), die als sensibel wahrgenommen werden können.

## 5. Gesamtwürdigung

Die Faktenlage ist **nicht eindeutig** und lässt nach vertretbarer Auslegung sowohl die Einschätzung "kein hohes Risiko" als auch "im Graubereich, eher meldepflichtig" zu. Tendenziell sprechen die **Art der Daten** (keine besonders schützenswerten Kategorien), der **begrenzte Empfängerkreis** (andere Kunden desselben Betriebs statt Öffentlichkeit) und die **schnelle, umfassende Behebung** für eine Einordnung als kein "hohes Risiko" im Sinne von Art. 24 Abs. 1 DSG.

Gleichzeitig ist der **wiederholte, strukturelle Charakter** über 7+ Monate sowie der **mindestens einmal tatsächlich eingetretene Schaden** ein Faktor, der eine rein defensive "es ist nichts passiert"-Argumentation nicht zulässt und bei einer allfälligen nachträglichen Prüfung kritisch hinterfragt werden könnte.

**Vorläufige, nicht bindende Einschätzung:** Auf Basis der oben dargestellten Fakten erscheint eine Einordnung als **kein meldepflichtiges "hohes Risiko"** vertretbar – vorausgesetzt, diese Einschätzung wird durch eine Datenschutz-/Rechtsberatung bestätigt und die getroffenen Massnahmen (Abschnitt 7 des Incident Reports) werden als ausreichend anerkannt. Unabhängig davon empfiehlt sich zu prüfen, ob Herr Menzi (und ggf. der nicht identifizierte dritte Kunde, falls später identifizierbar) individuell informiert werden sollten – nicht weil es gesetzlich zwingend ist, sondern aus Transparenz- und Vertrauensgründen.

---

## 6. Empfehlung

1. Diese Risikobewertung **vor einer endgültigen Entscheidung** einer Datenschutz-/Rechtsberatung zur Prüfung und Gegenzeichnung vorlegen.
2. Die Entscheidung (Meldung ja/nein) inkl. Begründung und Datum unten dokumentieren – unabhängig vom Ausgang. Eine dokumentierte, begründete Entscheidung gegen eine Meldung ist rechtlich deutlich besser vertretbar als eine unbegründete Nichthandlung.
3. Diese Bewertung bei Bedarf aktualisieren, falls neue Informationen auftauchen (z. B. Identität des dritten betroffenen Kunden, weitere Meldungen von Kunden).

---

## 7. Entscheidungsprotokoll

| Feld | Eintrag |
|---|---|
| Entscheidung | ☐ Meldung an EDÖB erforderlich  ☐ Keine Meldung erforderlich  ☐ Rückstellung bis Rechtsberatung erfolgt |
| Entschieden durch | _________________________ |
| Datum | _________________________ |
| Rechtsberatung konsultiert? | ☐ Ja, am ______  ☐ Nein |
| Begründung / Referenz auf Rechtsberatung | _________________________ |
| Information betroffener Kunden entschieden? | ☐ Ja  ☐ Nein  ☐ Noch offen |
