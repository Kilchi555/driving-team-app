# PCI-Compliance-Richtlinie — {{COMPANY_NAME}}

| | |
|---|---|
| **Unternehmen** | {{COMPANY_NAME}} |
| **Adresse** | {{COMPANY_ADDRESS}} |
| **UID** | {{COMPANY_UID}} |
| **In Kraft seit** | {{EFFECTIVE_DATE}} |
| **Nächste Überprüfung** | {{REVIEW_DATE}} (mindestens jährlich) |
| **Freigegeben durch** | {{APPROVER_NAME}}, {{APPROVER_TITLE}} |
| **Kontakt** | {{CONTACT_EMAIL}} |

---

## Zweck und Geltungsbereich

Diese Richtlinie beschreibt, wie {{COMPANY_NAME}} (im Folgenden «wir» / «das Unternehmen»)
den Payment Card Industry Data Security Standard (PCI DSS) einhält und sicherstellt, dass
alle über Wallee abgewickelten Zahlungen die grundlegenden Sicherheitsanforderungen
erfüllen.

Die Wallee Group AG ist nach PCI DSS **Level 1** zertifiziert und gewährleistet, dass
keine Karteninhaberdaten durch uns gespeichert, verarbeitet oder übertragen werden.
**Wir speichern, verarbeiten oder übertragen keine Karteninhaberdaten (CHD) auf unseren
eigenen Systemen.**

### Anwendbares PCI-DSS-Validierungslevel

Da Kartendaten ausschliesslich auf der extern gehosteten Zahlungsseite von Wallee erfasst
und niemals in unsere Systeme eingegeben, durch sie übertragen oder dort gespeichert
werden, qualifiziert sich unser Umfeld für **SAQ A** (vollständig ausgelagerte
Kartenabwicklung, Redirect-Modell).

## So funktioniert die Zahlung (technischer Geltungsbereich)

1. Die Zahlung wird über die Software-Plattform **Simy** (Simy IT Systems Kilchenmann,
   technischer Integrationspartner) abgewickelt. Beim Erstellen einer Transaktion werden
   **ausschliesslich** Betrag, Währung, Kundenname/-E-Mail sowie eine Auftrags­beschreibung
   an Wallee übermittelt — **niemals Kartendaten**.
2. Der Kunde wird auf die **extern gehostete Zahlungsseite von Wallee** weitergeleitet
   (`app-wallee.com`). Die vollständige Kartennummer (PAN), das Ablaufdatum und der
   CVV werden **dort** auf Wallees PCI-zertifizierten Systemen eingegeben — niemals auf
   einer Seite des Unternehmens.
3. Nach der Zahlung leitet Wallee den Kunden zurück. Gespeichert werden **ausschliesslich**
   eine Wallee-Transaktionsreferenz und ggf. ein **opaker Wallee-Zahlungs-Token**. Es
   werden niemals PAN, CVV oder Ablaufdatum gespeichert.
4. Hosting (Vercel) und Datenbank (Supabase) der Plattform erhalten somit niemals
   Karteninhaberdaten.

## Grundsätze

- Alle Kartentransaktionen werden ausschliesslich über die PCI-zertifizierten Systeme der
  Wallee Group AG abgewickelt.
- Wir speichern oder verarbeiten keine Karteninhaberdaten auf eigenen Systemen. Es werden
  nur nicht-sensible Wallee-Referenzen (Transaktions-IDs und opake Tokens) aufbewahrt.
- Auf unseren Seiten werden keine Zahlungs-Eingabe-Skripte Dritter geladen; die
  Karteneingabe erfolgt vollständig auf Wallees gehosteter Seite.
- Die PCI-DSS-Konformität (SAQ A) wird mindestens jährlich überprüft, ausgefüllt und
  dokumentiert.
- Alle Personen mit Zugang zu zahlungsrelevanten Systemen verwenden starke, eindeutige
  Zugangsdaten sowie — wo verfügbar — Mehrfaktor- bzw. Passkey-Authentifizierung.

## Verantwortlichkeiten

| Rolle | Verantwortung |
|------|----------------|
| **PCI-Compliance-Verantwortliche/r** — {{APPROVER_NAME}} | Koordiniert die PCI-Aktivitäten, füllt die jährliche SAQ-A-Selbstbeurteilung aus, prüft sie und dokumentiert die Konformität. |
| **Technischer Plattformpartner** — Simy IT Systems Kilchenmann | Stellt sicher, dass über die Plattform keine Karteninhaberdaten verarbeitet oder gespeichert werden und die Kartenabwicklung ausschliesslich über Wallee erfolgt. |
| **Geschäftsleitung** — {{COMPANY_NAME}} | Genehmigt diese Richtlinie und stellt die erforderlichen Ressourcen bereit. |
| **Alle Mitarbeitenden** | Verstehen und befolgen diese PCI-Compliance-Richtlinie. |

## Überprüfung und Kommunikation

Diese Richtlinie wird mindestens jährlich überprüft oder immer dann, wenn wesentliche
technologische oder geschäftliche Änderungen eintreten (z. B. Wechsel des
Zahlungsabwicklers oder Änderung der Zahlungsintegration). Sie wird allen Mitarbeitenden
zur Verfügung gestellt und Wallee auf Anfrage übermittelt.

## Schulung und Sensibilisierung

Alle relevanten Mitarbeitenden erhalten jährlich eine Schulung und Auffrischung zu
PCI-Themen (mindestens die Bestätigung, dass sie diese PCI-Compliance-Richtlinie kennen
und befolgen).
