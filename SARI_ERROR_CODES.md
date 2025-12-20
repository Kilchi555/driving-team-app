# SARI API Error Codes & Constraint Validation

## Bekannte SARI Error Response Codes

Diese basieren auf SARI API Responses und sollten entsprechend gehandhabt werden:

### Customer/Participant Errors

| Error Code | Bedeutung | User-Meldung | Handlung |
|---|---|---|---|
| `MISMATCH_BIRTHDATE_FABERID` | FABERID und Geburtsdatum passen nicht zusammen | "Ausweisnummer und/oder Geburtsdatum sind falsch" | Benutzer soll Daten überprüfen |
| `NOT_FOUND` | Kunde/FABERID existiert nicht in SARI | "Ausweisnummer nicht gefunden" | Benutzer soll Ausweisnummer prüfen |
| `INVALID_FABERID` | FABERID-Format ist ungültig | "Ungültige Ausweisnummer" | Validierung des Formats |
| `INVALID_BIRTHDATE` | Geburtsdatum-Format ist ungültig | "Ungültiges Geburtsdatum" | Format YYYY-MM-DD erforderlich |

### License/Eligibility Errors

| Error Code | Bedeutung | User-Meldung | Handlung |
|---|---|---|---|
| `LICENSE_EXPIRED` | Führerscheinkategorie ist abgelaufen | "Ihr Führerschein für diese Kategorie ist abgelaufen" | Benutzer kann sich nicht anmelden |
| `LICENSE_NOT_VALID` | Führerschein hat nicht die erforderliche Kategorie | "Sie haben nicht die erforderliche Führerscheinkategorie" | Benutzer kann sich nicht anmelden |
| `LICENSE_UNDER_PROBATION` | Führerschein ist noch in Probezeit | "Ihr Führerschein ist noch in Probezeit" | Informativ, ggf. erforderlich |
| `AGE_RESTRICTION` | Teilnehmer ist zu jung oder zu alt | "Sie erfüllen die Altersanforderungen nicht" | Benutzer kann sich nicht anmelden |

### Course Enrollment Errors

| Error Code | Bedeutung | User-Meldung | Handlung |
|---|---|---|---|
| `COURSE_FULL` | Kurs ist ausgebucht | "Der Kurs ist ausgebucht" | Benutzer kann sich nicht anmelden |
| `COURSE_CANCELLED` | Kurs wurde storniert | "Der Kurs wurde abgesagt" | Benutzer kann sich nicht anmelden |
| `ALREADY_ENROLLED` | Teilnehmer ist bereits in diesem Kurs angemeldet | "Sie sind bereits in diesem Kurs angemeldet" | Duplikat-Schutz |
| `COURSE_IN_PAST` | Kurs liegt in der Vergangenheit | "Der Kurs hat bereits stattgefunden" | Benutzer kann sich nicht anmelden |
| `REGISTRATION_DEADLINE_PASSED` | Anmeldeschluss ist vorbei | "Die Anmeldefrist für diesen Kurs ist abgelaufen" | Benutzer kann sich nicht anmelden |

### Time/Scheduling Conflicts

| Error Code | Bedeutung | User-Meldung | Handlung |
|---|---|---|---|
| `SCHEDULING_CONFLICT` | Teilnehmer hat einen zeitlichen Konflikt mit einem anderen Kurs | "Sie sind zu dieser Zeit bereits in einem anderen Kurs angemeldet" | Benutzer soll Zeit überprüfen |
| `DOUBLE_BOOKING` | Doppelbuchung erkannt | "Zeitlich Überschneidung mit anderem Termin" | Konflikt-Auflösung erforderlich |

### Payment & Prerequisite Errors

| Error Code | Bedeutung | User-Meldung | Handlung |
|---|---|---|---|
| `PREREQUISITE_NOT_MET` | Vorbedingung nicht erfüllt (z.B. Theorie nicht absolviert) | "Sie müssen zuerst den Theorieteil absolvieren" | Benutzer muss Vorbedingung erfüllen |
| `PAYMENT_REQUIRED` | Zahlung erforderlich | "Zahlung erforderlich" | Payment-Flow |
| `PAYMENT_FAILED` | Zahlung fehlgeschlagen | "Zahlungsverarbeitung fehlgeschlagen" | Zahlungsproblem |

### API & System Errors

| Error Code | Bedeutung | User-Meldung | Handlung |
|---|---|---|---|
| `UNAUTHORIZED` | API-Authentifizierung fehlgeschlagen | "Systemfehler: Authentifizierung" | Admin kontaktieren |
| `INVALID_REQUEST` | Request-Format ist ungültig | "Systemfehler: Ungültige Anfrage" | Developer-Fehler |
| `SERVER_ERROR` | SARI Server-Fehler | "Systemfehler: Bitte versuchen Sie später erneut" | Retry später |
| `TIMEOUT` | Request-Timeout | "Verbindungszeitüberschreitung" | Retry später |

---

## Implementierung in Enrollment-Flow

### getCustomer Error Handling
```typescript
if (error.message?.includes('MISMATCH_BIRTHDATE_FABERID')) {
  // User-freundliche Meldung
}
if (error.message?.includes('NOT_FOUND')) {
  // Ausweisnummer nicht gefunden
}
if (error.message?.includes('LICENSE_EXPIRED')) {
  // Führerschein abgelaufen
}
```

### enrollStudent Error Handling
```typescript
if (error.message?.includes('ALREADY_ENROLLED')) {
  // Bereits angemeldet
}
if (error.message?.includes('SCHEDULING_CONFLICT')) {
  // Zeitlicher Konflikt
}
if (error.message?.includes('COURSE_FULL')) {
  // Kurs voll
}
if (error.message?.includes('COURSE_IN_PAST')) {
  // Kurs liegt in Vergangenheit
}
```

---

## Constraint Validierung die SARI macht

### Gültigkeitsvalidierungen
- ✅ FABERID/Geburtsdatum Matching
- ✅ Gültigkeit des Führerscheins (nicht abgelaufen)
- ✅ Erforderliche Führerscheinkategorie
- ✅ Altersanforderungen
- ✅ Probezeit-Status

### Kurs-Validierungen
- ✅ Kurs existiert
- ✅ Kurs nicht voll (max_participants)
- ✅ Kurs nicht storniert
- ✅ Kurs liegt nicht in der Vergangenheit
- ✅ Anmeldefrist nicht vorbei
- ✅ Keine Doppelbuchung

### Anmeldungs-Validierungen
- ✅ Keine doppelte Anmeldung (ALREADY_ENROLLED)
- ✅ Keine zeitlichen Konflikte (SCHEDULING_CONFLICT)
- ✅ Voraussetzungen erfüllt (PREREQUISITE_NOT_MET)

---

## Nächste Schritte

1. **Error-Handling verbessern** - Alle bekannten SARI Errors abfangen und user-freundlich darstellen
2. **Validation-Layer hinzufügen** - Client-seitige Validierungen basierend auf SARI Constraints
3. **Logging erweitern** - Detaillierte Logs für jeden Error-Code zum Debugging
4. **Benutzer-Feedback** - Clear, actionable error messages für jeden Case

