# SARI Enrollment - Quick Start

## Für Endbenutzer (Kursanmeldung)

### Schritt 1: Kursseite öffnen
1. Besuche die öffentliche Kursseite: `http://localhost:3000/courses`
2. Wähle einen SARI-verwalteten Kurs (blau markiert)
3. Klicke auf "Anmelden"

### Schritt 2: SARI Daten eingeben (nur SARI-Kurse)
1. Gib deine **Ausweisnummer (FABERID)** ein
   - Format: `5401234567890`
2. Wähle dein **Geburtsdatum**
3. Klicke "Daten laden"

### Schritt 3: Daten bestätigen
- Überprüfe deine Daten (aus SARI geladen)
- Gib deine **E-Mail-Adresse ein** (falls nicht in SARI)
- Klicke "Zur Zahlung"

### Schritt 4: Zahlungsmethode wählen
Wähle eine der Zahlungsmethoden:
- Kreditkarte
- TWINT
- PayPal

Klicke auf "CHF [Betrag] zahlen"

### Schritt 5: Wallee Checkout
- Du wirst zu Wallee weitergeleitet
- Zahlung durchführen
- Nach Erfolg automatisch zurück zur Success Page

### Schritt 6: Bestätigung
- Bestätigungsseite mit Anmeldungsdetails
- Bestätigungsmail erhalten

---

## Für Administratoren

### SARI Integration Checklist

#### 1. SARI Credentials einrichten
- Gehe zu: Admin Panel → Profile → SARI Settings
- Füge ein:
  - **Environment:** `test` oder `production`
  - **Client ID:** Von Kyberna
  - **Client Secret:** Von Kyberna
  - **Username:** SARI API User
  - **Password:** SARI API Password
- Klicke "Verbindung testen"
- Speichere die Settings

#### 2. Kurse aus SARI importieren
- Gehe zu: Admin Panel → SARI Settings
- Klicke "SARI Kurse synchronisieren"
- System importiert automatisch:
  - ✅ Kursgruppen als Kurse
  - ✅ Einzelne Teile als Sessions
  - ✅ Teilnehmer und Registrierungen

#### 3. Public Page konfigurieren
- Sicherstelle, dass Kurse auf `status = 'active'` gesetzt sind
- SARI-verwaltete Kurse können in Admin nicht bearbeitet werden
- Test-Link: `/courses/enroll/[courseId]`

#### 4. Payment konfigurieren
- Wallee Credentials sind bereits konfiguriert (via tenant_settings)
- Test Transaktionen können direkt über die Seite gemacht werden
- Live Transaktionen funktionieren mit Production Credentials

### Troubleshooting

#### SARI Lookup funktioniert nicht
```
Fehler: "SARI-Daten konnten nicht geladen werden"
```
**Lösung:**
- FABERID Format überprüfen
- SARI API Credentials testen
- SARI API Response überprüfen

#### Payment fehlgeschlagen
```
Fehler: "Zahlungsverarbeitung fehlgeschlagen"
```
**Lösung:**
- Wallee Credentials überprüfen
- Test-Modus überprüfen (test vs production)
- Wallee Dashboard auf Errors überprüfen

#### Email nicht versendet
```
Keine Bestätigungsmail nach erfolgreicher Anmeldung
```
**Lösung:**
- Resend API Key überprüfen
- Email Address überprüfen
- Server Logs auf Errors überprüfen

### Monitoring

#### Analytics Dashboard
Geplant für Zukunft:
- Anmeldungen pro Kurs
- Zahlungsrate
- SARI Sync Erfolgsrate
- Email Delivery Rate

#### Debug Logs
Server Logs zeigen:
```
✅ Enrollment completion email sent to: max@example.com
📝 Enrolling student in SARI course
✅ Student enrolled in SARI
```

---

## Nützliche URLs

### Frontend
- Kursübersicht: `/courses`
- Einzelne Anmeldung: `/courses/enroll/[courseId]`
- Erfolgsseite: `/courses/enrollment-success`

### Admin Panel
- SARI Settings: `/admin/profile?tab=sari`
- Kursverwaltung: `/admin/courses`
- Teilnehmer: `/admin/courses?tab=participants`

### API Endpoints
- SARI Lookup: `POST /api/sari/lookup-customer`
- Wallee Transaction: `POST /api/payment-gateway/create-transaction`
- Enrollment Complete: `POST /api/courses/enroll-complete`
- Wallee Webhook: `POST /api/payment-gateway/webhook`

---

## Support

Bei Problemen bitte überprüfen:
1. Server Logs: `docker logs app`
2. Supabase Logs: Supabase Dashboard
3. Wallee Logs: Wallee Dashboard
4. Browser Console: Browser DevTools (F12)

