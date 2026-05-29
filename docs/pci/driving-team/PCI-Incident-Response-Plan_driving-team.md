# PCI Incident-Response-Plan — Driving Team Zürich GmbH

| | |
|---|---|
| **Unternehmen** | Driving Team Zürich GmbH |
| **Adresse** | Baslerstrasse 145, 8048 Zürich |
| **UID** | CHE-293.989.777 |
| **In Kraft seit** | 2026-05-29 |
| **Nächste Überprüfung** | 2027-05-29 (mindestens jährlich getestet) |
| **Freigegeben durch** | Pascal Kilchenmann, Geschäftsführer |
| **Kontakt** | info@drivingteam.ch |

---

## Zweck und Zielsetzung

Dieser Plan definiert, wie Driving Team Zürich GmbH (im Folgenden «wir» / «das Unternehmen») auf
Sicherheitsvorfälle reagiert, die Karteninhaberdaten oder die PCI-DSS-Konformität
betreffen könnten. Ziel ist es, Risiken zu minimieren, Vorfälle rasch einzudämmen und eine
wirksame Kommunikation mit den betroffenen Parteien sicherzustellen.

Dieser Prozess gilt für alle Systeme, Netzwerke und Personen, die an der Verarbeitung,
Übertragung oder Speicherung zahlungsrelevanter Daten beteiligt sind. Er umfasst alle
Arten von Sicherheitsvorfällen, einschliesslich vermuteter Datenschutzverletzungen,
Malware-Infektionen, unbefugtem Zugriff, Kontokompromittierung und Datenverlust.

> **Kontext:** Karteninhaberdaten werden niemals auf den Systemen des Unternehmens oder
> der Plattform Simy gespeichert, verarbeitet oder übertragen — sie werden ausschliesslich
> von Wallees PCI-zertifizierter, gehosteter Zahlungsseite verarbeitet. Die relevantesten
> Vorfallarten sind daher: Kompromittierung eines administrativen Kontos, Kompromittierung
> der Wallee-API-Zugangsdaten, unbefugter Zugriff auf die Datenbank oder Kompromittierung
> der Hosting-Umgebung.

## Rollen und Verantwortlichkeiten

| Rolle | Verantwortung |
|------|----------------|
| **Incident-Koordinator/in** — Pascal Kilchenmann (info@drivingteam.ch) | Koordiniert das Vorfallmanagement, dokumentiert den Vorfall und informiert relevante Parteien (z. B. Acquirer, Wallee, Behörden, betroffene Kunden). |
| **Technische Leitung** — Simy IT Systems Kilchenmann (Plattformpartner) | Analysiert technische Ursachen, führt die Eindämmung (Rotation von Zugangsdaten, Sperren von Zugängen) und die Wiederherstellung durch. |
| **Kommunikationsleitung** — Driving Team Zürich GmbH | Steuert die interne und externe Kommunikation, einschliesslich mit Kunden und Behörden. |

## Wichtige Kontakte

| Partei | Kontakt |
|-------|---------|
| Wallee Support | support@wallee.com |
| Eidg. Datenschutz- und Öffentlichkeitsbeauftragter (EDÖB) | https://www.edoeb.admin.ch — bei Verletzungen des Personendatenschutzes nach revDSG |
| Kantonspolizei | bei Verdacht auf strafbare Handlungen (z. B. Cyberkriminalität) |
| Plattformpartner | Simy IT Systems Kilchenmann — info@simy.ch |

## Vorgehen bei einem Vorfall

1. **Erkennung und Meldung** — Jede verdächtige Aktivität wird unverzüglich an den/die
   Incident-Koordinator/in (info@drivingteam.ch) gemeldet.
2. **Identifikation und Erstbeurteilung** — Der Vorfall wird protokolliert (Datum,
   Uhrzeit und detaillierte Beobachtungen) und es erfolgt eine vorläufige Analyse von Art
   und Umfang des Vorfalls.
3. **Eindämmung** — Betroffene Systeme werden isoliert, um weiteren Schaden zu verhindern.
   Typische Eindämmungsmassnahmen:
   - Rotation der Wallee-API-Zugangsdaten (Space-User / API-Secret) in der Konfiguration.
   - Rotation der Datenbank-Schlüssel und Überprüfung der Zugriffsrichtlinien (RLS).
   - Sperren/Deaktivieren kompromittierter Admin-Konten; erzwungener Passwort-Reset und erneute Passkey-/MFA-Registrierung.
   - Bei Bedarf betroffene Deployments offline nehmen oder zurückrollen.
4. **Kommunikation** — Wallee (support@wallee.com) und betroffene Kunden werden ohne
   unangemessene Verzögerung benachrichtigt. Sind Personendaten betroffen, wird der EDÖB
   gemäss revDSG informiert; bei Verdacht auf strafbare Handlungen wird die Kantonspolizei
   eingeschaltet.
5. **Beseitigung** — Die Bedrohung wird aus dem System entfernt, Ursache und
   Schwachstellen werden identifiziert und allfällige Malware oder unbefugte Zugangspunkte
   beseitigt.
6. **Wiederherstellung** — Systeme werden überprüft, bereinigt und sicher in den Betrieb
   zurückgeführt. Vor der Wiederaufnahme des Normalbetriebs wird getestet, dass alles
   sicher läuft.
7. **Nachbearbeitung** — Der Vorfall wird dokumentiert, analysiert und es werden
   Korrekturmassnahmen definiert und umgesetzt, um eine Wiederholung zu verhindern.

## Kommunikation

Alle Vorfälle, die Karteninhaberdaten oder die PCI-Konformität betreffen, müssen **ohne
Verzögerung** an Wallee (support@wallee.com) und — sofern zutreffend — an die zuständigen
Behörden gemeldet werden (EDÖB bei Personendatenverletzungen; Kantonspolizei bei
strafbaren Handlungen). Die interne Kommunikation erfolgt stets über sichere Kanäle.

## Schulung und Überprüfung

Alle relevanten Mitarbeitenden erhalten jährlich eine Schulung zum Incident-Response-
Prozess. Dieser Plan wird mindestens einmal jährlich getestet und bei Bedarf aktualisiert.
