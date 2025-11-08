# Zahlungs-Erinnerungs-System

## Übersicht

Das erweiterte Zahlungs-Erinnerungs-System sendet automatisch E-Mails und SMS an Kunden, die ihre Termine noch nicht bestätigt haben. Unbestätigte Termine werden nach einer konfigurierbaren Frist automatisch gelöscht.

## Features

### 1. Automatische E-Mail-Erinnerungen
- **Erste E-Mail**: Wird sofort nach Payment-Erstellung gesendet
- **Wiederholte E-Mails**: Basierend auf Konfiguration (z.B. alle 2 Tage)
- **Anzahl konfigurierbar**: Admin kann 0-10 E-Mails definieren
- **Intervall konfigurierbar**: Admin kann Tage zwischen E-Mails definieren

### 2. SMS als letzte Warnung
- **Optional**: Kann aktiviert/deaktiviert werden
- **Nach allen E-Mails**: SMS wird nur nach allen E-Mails gesendet
- **Twilio Integration**: Verwendet Twilio für SMS-Versand

### 3. Automatische Termin-Löschung
- **Konfigurierbar**: Admin definiert Zeitfenster (z.B. 72h nach frühester Autorisierung)
- **Soft Delete**: Termine werden als `cancelled` markiert
- **Benachrichtigungen**: Kunde und Staff werden per E-Mail informiert

### 4. Admin-Konfiguration
- **Zentrale Einstellungen**: In `/admin/profile` unter "Zahlungen"
- **Erinnerungs-Historie**: Neue Seite `/admin/payment-reminders`
- **Statistiken**: Anzahl gesendeter E-Mails, SMS, Fehler

## Datenbank-Schema

### Neue Tabelle: `payment_reminders`
```sql
CREATE TABLE payment_reminders (
  id UUID PRIMARY KEY,
  payment_id UUID REFERENCES payments(id),
  reminder_type VARCHAR(10) CHECK (reminder_type IN ('email', 'sms')),
  reminder_number INTEGER,
  sent_at TIMESTAMPTZ,
  status VARCHAR(20) CHECK (status IN ('sent', 'failed', 'bounced')),
  error_message TEXT,
  metadata JSONB
)
```

### Neue Spalten in `payments`
- `first_reminder_sent_at`: Zeitpunkt der ersten Erinnerung
- `last_reminder_sent_at`: Zeitpunkt der letzten Erinnerung
- `reminder_count`: Anzahl gesendeter Erinnerungen

### Neue Spalte in `payments`
- `scheduled_authorization_date`: Zeitpunkt der geplanten Autorisierung

### Neue Einstellungen in `tenant_settings`
```json
{
  "reminder_email_count": 3,
  "reminder_email_interval_days": 2,
  "reminder_sms_enabled": false,
  "reminder_sms_after_emails": true,
  "auto_delete_enabled": false,
  "auto_delete_hours_after_auth_deadline": 72,
  "notify_staff_on_auto_delete": true
}
```

## Workflow

### 1. Payment-Erstellung
```
Termin erstellt (pending_confirmation)
  ↓
Payment erstellt
  ↓
Erste E-Mail sofort gesendet
  ↓
`first_reminder_sent_at` gesetzt
  ↓
`reminder_count` = 1
```

### 2. Wiederholte Erinnerungen (Cron Job)
```
Cron Job läuft (z.B. täglich)
  ↓
Prüfe alle `pending` Payments
  ↓
Ist Intervall erreicht? (z.B. 2 Tage seit letzter E-Mail)
  ↓
Ja: Sende nächste E-Mail
  ↓
`last_reminder_sent_at` aktualisiert
  ↓
`reminder_count` erhöht
```

### 3. SMS-Warnung (Optional)
```
Alle E-Mails gesendet?
  ↓
SMS aktiviert?
  ↓
Intervall seit letzter E-Mail erreicht?
  ↓
Ja: Sende SMS
  ↓
Eintrag in `payment_reminders` (type: 'sms')
```

### 4. Auto-Löschung (Cron Job)
```
Cron Job läuft
  ↓
Auto-Delete aktiviert?
  ↓
Prüfe alle `pending_confirmation` Termine
  ↓
scheduled_authorization_date + X Stunden < jetzt?
  ↓
Ja: Termin stornieren
  ↓
Payment auf `failed` setzen
  ↓
E-Mail an Kunde senden
  ↓
E-Mail an Staff senden (optional)
```

## Beispiel-Konfiguration

### Beispiel 1: 3 E-Mails, alle 2 Tage, mit SMS
```json
{
  "reminder_email_count": 3,
  "reminder_email_interval_days": 2,
  "reminder_sms_enabled": true,
  "reminder_sms_after_emails": true,
  "auto_delete_enabled": true,
  "auto_delete_hours_after_auth_deadline": 72,
  "notify_staff_on_auto_delete": true
}
```

**Timeline:**
- Tag 0: Termin erstellt → E-Mail #1
- Tag 2: E-Mail #2
- Tag 4: E-Mail #3
- Tag 6: SMS
- Tag 9 (72h nach Tag 6): Auto-Löschung

### Beispiel 2: Nur 1 E-Mail, keine SMS, keine Auto-Löschung
```json
{
  "reminder_email_count": 1,
  "reminder_email_interval_days": 1,
  "reminder_sms_enabled": false,
  "auto_delete_enabled": false
}
```

**Timeline:**
- Tag 0: Termin erstellt → E-Mail #1
- Keine weiteren Aktionen

## API-Endpunkte

### 1. Erste Erinnerung senden
```
POST /api/reminders/send-payment-confirmation
Body: {
  paymentId: string,
  userId: string,
  tenantId: string
}
```

### 2. Löschungs-Benachrichtigung senden
```
POST /api/reminders/send-deletion-notification
Body: {
  appointmentId: string,
  userId?: string,
  staffId?: string,
  tenantId: string,
  type: 'customer' | 'staff'
}
```

## Cron Jobs

### 1. `send-payment-reminders`
- **Schedule**: Täglich (oder öfter)
- **Funktion**: Sendet wiederholte E-Mails und SMS
- **Endpoint**: `/api/cron/send-payment-reminders`

### 2. `process-automatic-payments`
- **Schedule**: Stündlich
- **Funktion**: 
  - Verarbeitet automatische Zahlungen
  - Prüft Auto-Löschung
- **Endpoint**: `/api/cron/process-automatic-payments`

## E-Mail-Templates

### 1. Zahlungs-Erinnerung
- **Betreff**: "Terminbestätigung erforderlich" / "Erinnerung" / "Letzte Erinnerung"
- **Inhalt**: Termin-Details, Link zum Dashboard, Betrag
- **Template**: `generatePaymentReminderEmail()` in `server/utils/email.ts`

### 2. Termin gelöscht (Kunde)
- **Betreff**: "Termin storniert"
- **Inhalt**: Stornierungsgrund, Kontaktdaten
- **Template**: `generateAppointmentDeletedEmail()` in `server/utils/email.ts`

### 3. Termin gelöscht (Staff)
- **Betreff**: "Termin automatisch storniert"
- **Inhalt**: Kunde, Termin-Details, Grund
- **Template**: `generateStaffNotificationEmail()` in `server/utils/email.ts`

## SMS-Templates

### 1. Zahlungs-Erinnerung
- **Inhalt**: Kurze Warnung, Link zum Dashboard
- **Template**: `generatePaymentReminderSMS()` in `server/utils/sms.ts`

### 2. Termin gelöscht
- **Inhalt**: Stornierungsinfo, Kontakt
- **Template**: `generateAppointmentDeletedSMS()` in `server/utils/sms.ts`

## Admin-UI

### 1. Einstellungen
- **Pfad**: `/admin/profile` → Tab "Zahlungen"
- **Sektion**: "Zahlungs-Erinnerungen"
- **Felder**:
  - Anzahl E-Mails
  - Intervall (Tage)
  - SMS aktivieren
  - Auto-Löschung aktivieren
  - Löschungs-Zeitfenster (Stunden)
  - Staff benachrichtigen

### 2. Erinnerungs-Historie
- **Pfad**: `/admin/payment-reminders`
- **Inhalt**:
  - Statistiken (E-Mails, SMS, Fehler)
  - Tabelle mit allen Erinnerungen
  - Filter nach Typ, Status

## Umgebungsvariablen

### Resend (E-Mail)
```env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@drivingteam.ch
```

### Twilio (SMS)
```env
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+41...
```

## Testing

### 1. Lokales Testing
```bash
# SQL-Migration ausführen
psql -U postgres -d your_db -f create_payment_reminders_system.sql

# Dev-Server starten
npm run dev

# Termin erstellen und prüfen ob erste E-Mail gesendet wird
# Logs prüfen: "📧 Sending first payment confirmation reminder..."
```

### 2. Cron Job Testing
```bash
# Manuell triggern über Admin UI
# Pfad: /admin/cron-status
# Button: "Manuell ausführen" bei "send-payment-reminders"
```

### 3. E-Mail Testing
- Verwende echte E-Mail-Adresse
- Prüfe Spam-Ordner
- Prüfe Resend Dashboard für Logs

### 4. SMS Testing
- Verwende echte Telefonnummer
- Prüfe Twilio Dashboard für Logs
- Beachte: SMS kosten Geld!

## Troubleshooting

### E-Mails werden nicht gesendet
1. Prüfe `RESEND_API_KEY` in Umgebungsvariablen
2. Prüfe Resend Dashboard für Fehler
3. Prüfe Server-Logs für Fehler
4. Prüfe `payment_reminders` Tabelle für Einträge

### SMS werden nicht gesendet
1. Prüfe Twilio-Credentials
2. Prüfe Telefonnummer-Format (+41...)
3. Prüfe Twilio Dashboard für Fehler
4. Prüfe ob SMS aktiviert ist in Einstellungen

### Auto-Löschung funktioniert nicht
1. Prüfe ob aktiviert in Einstellungen
2. Prüfe Cron Job läuft (`/admin/cron-status`)
3. Prüfe `scheduled_authorization_date` in Payments
4. Prüfe Server-Logs für Fehler

### Cron Jobs laufen nicht
1. Prüfe Vercel Cron Dashboard
2. Prüfe `vercel.json` Konfiguration
3. Prüfe Vercel Pro Plan (für stündliche Jobs)
4. Manuell triggern über Admin UI

## Migration von altem System

Falls du bereits ein altes Erinnerungs-System hast:

1. **SQL-Migration ausführen**:
   ```bash
   psql -U postgres -d your_db -f create_payment_reminders_system.sql
   ```

2. **Alte Einstellungen migrieren**:
   - Alte `reminder_settings` Tabelle kann gelöscht werden
   - Neue Einstellungen in `tenant_settings` verwenden

3. **Alte Cron Jobs deaktivieren**:
   - Entferne alte Cron Job Konfiguration
   - Neue Cron Jobs verwenden

## Best Practices

1. **E-Mail-Anzahl**: 2-3 E-Mails sind optimal
2. **Intervall**: 2-3 Tage zwischen E-Mails
3. **SMS**: Nur als letzte Warnung verwenden (Kosten!)
4. **Auto-Löschung**: Mindestens 3 Tage nach letzter Erinnerung
5. **Testing**: Immer mit Test-Daten testen vor Produktion
6. **Monitoring**: Regelmäßig `/admin/payment-reminders` prüfen

## Support

Bei Fragen oder Problemen:
1. Prüfe diese README
2. Prüfe Server-Logs
3. Prüfe Admin-UI (`/admin/payment-reminders`, `/admin/cron-status`)
4. Kontaktiere Pascal

