# Erinnerungs-System für Zahlungen

## Übersicht

Das automatische Erinnerungs-System sendet mehrstufige Erinnerungen an Fahrschüler für ausstehende Zahlungen. Das System ist vollständig konfigurierbar und unterstützt Email, SMS und Push-Benachrichtigungen.

## Architektur

### 1. **Komponenten**

#### Frontend
- **Admin-Profil** (`pages/admin/profile.vue`)
  - Tab "Erinnerungen": Konfiguration der Erinnerungs-Einstellungen
  - Tab "Nachrichten-Vorlagen": Verwaltung der Templates
  - Auto-Save für alle Einstellungen

- **Test-Seite** (`pages/admin/reminder-test.vue`)
  - Manueller Cron-Job Trigger
  - Test einzelner Erinnerungen
  - Erinnerungs-Logs Ansicht

#### Backend
- **Composable** (`composables/useReminderService.ts`)
  - Template-Processing mit Variablen-Ersetzung
  - Email/SMS/Push Versand
  - Reminder-Logs

- **Cron-API** (`server/api/cron/send-payment-reminders.post.ts`)
  - Automatische Verarbeitung aller fälligen Erinnerungen
  - Tenant-basierte Konfiguration
  - Mehrstufiges Erinnerungs-System

#### Datenbank
- **`reminder_templates`**: Nachrichten-Vorlagen pro Tenant
- **`reminder_logs`**: Protokollierung aller gesendeten Erinnerungen
- **`tenant_settings`**: Erinnerungs-Konfiguration pro Tenant
- **`payments`**: Tracking der letzten Erinnerung

### 2. **Workflow**

```
1. Admin erstellt Termin
   ↓
2. Zahlung wird erstellt (Status: pending)
   ↓
3. Cron-Job läuft (z.B. stündlich)
   ↓
4. System prüft alle Tenants mit aktivierten Erinnerungen
   ↓
5. Für jeden Tenant: Lade alle pending Zahlungen
   ↓
6. Prüfe für jede Zahlung:
   - Stunden seit Erstellung
   - Letzte gesendete Erinnerung
   - Fällige Erinnerungs-Stufe
   ↓
7. Sende Erinnerung über konfigurierte Kanäle:
   - Email (mit Betreff + Body)
   - SMS (nur Body)
   - Push (nur Body)
   ↓
8. Update Payment mit last_reminder_sent_at + last_reminder_stage
   ↓
9. Erstelle Log-Eintrag in reminder_logs
```

### 3. **Erinnerungs-Stufen**

#### 1. Erinnerung (first)
- **Wann**: X Stunden nach Zahlung-Erstellung
- **Ton**: Freundliche Erinnerung
- **Beispiel**: "Bitte bestätigen Sie Ihren Termin"

#### 2. Erinnerung (second)
- **Wann**: Y Stunden nach Zahlung-Erstellung
- **Ton**: Dringlichere Erinnerung
- **Beispiel**: "Erinnerung: Terminbestätigung noch ausstehend"

#### Finale Warnung (final)
- **Wann**: Z Stunden nach Zahlung-Erstellung
- **Ton**: Letzte Warnung
- **Beispiel**: "LETZTE WARNUNG: Termin wird gelöscht"

### 4. **Template-Variablen**

Folgende Variablen können in Templates verwendet werden:

- `{{student_name}}` - Vor- und Nachname des Fahrschülers
- `{{appointment_date}}` - Datum des Termins (formatiert)
- `{{appointment_time}}` - Uhrzeit des Termins
- `{{location}}` - Standort des Termins
- `{{price}}` - Preis in CHF
- `{{payment_link}}` - Link zur Zahlungsseite
- `{{confirmation_link}}` - Link zur Bestätigung (aktuell = payment_link)

**Beispiel-Template:**
```
Hallo {{student_name}},

bitte bezahlen Sie Ihren Termin am {{appointment_date}} um {{appointment_time}} Uhr.

Standort: {{location}}
Preis: {{price}} CHF

Jetzt bezahlen: {{payment_link}}

Mit freundlichen Grüßen
Ihr Driving Team
```

## Setup

### 1. Datenbank-Migration ausführen

```sql
-- In Supabase SQL Editor ausführen
-- Datei: add_reminder_logs_table.sql
```

Diese Migration erstellt:
- `reminder_logs` Tabelle
- Zusätzliche Spalten in `payments` Tabelle
- Notwendige Indizes und RLS Policies

### 2. Standard-Templates erstellen

```bash
# API-Endpunkt aufrufen (einmalig)
POST /api/reminder/seed-templates
```

Dies erstellt Standard-Templates für alle 3 Stufen und 3 Kanäle.

### 3. Erinnerungen im Admin-Profil aktivieren

1. Als Admin einloggen
2. Zu "Profil" → Tab "Erinnerungen" navigieren
3. "Erinnerungen aktiv" einschalten
4. Zeitintervalle konfigurieren (z.B. 24h, 48h, 72h)
5. Kanäle pro Stufe aktivieren (Email, SMS, Push)
6. Einstellungen werden automatisch gespeichert

### 4. Templates anpassen (optional)

1. Zu "Profil" → Tab "Nachrichten-Vorlagen" navigieren
2. Stufe und Kanal auswählen
3. Template bearbeiten
4. Variablen verwenden: `{{variable_name}}`
5. Änderungen werden automatisch gespeichert

### 5. Cron-Job einrichten

#### Option A: Manuell testen
1. Zu `/admin/reminder-test` navigieren
2. "Cron-Job ausführen" klicken
3. Logs überprüfen

#### Option B: Automatisch (Empfohlen)
Verwende einen externen Cron-Service wie:
- **Vercel Cron** (wenn auf Vercel deployed)
- **GitHub Actions** (scheduled workflow)
- **EasyCron** oder **cron-job.org**

**Beispiel: Vercel Cron**
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/send-payment-reminders",
    "schedule": "0 * * * *"
  }]
}
```

**Beispiel: GitHub Actions**
```yaml
# .github/workflows/send-reminders.yml
name: Send Payment Reminders
on:
  schedule:
    - cron: '0 * * * *'  # Jede Stunde
jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Cron Job
        run: |
          curl -X POST https://your-domain.com/api/cron/send-payment-reminders
```

## Testen

### 1. Test-Seite verwenden

1. Navigiere zu `/admin/reminder-test`
2. Erstelle eine Test-Zahlung mit Status "pending"
3. Kopiere die Payment-ID
4. Wähle Erinnerungs-Stufe und Kanäle
5. Klicke "Test-Erinnerung senden"
6. Überprüfe Logs

### 2. Manueller Cron-Job Test

1. Navigiere zu `/admin/reminder-test`
2. Klicke "Cron-Job ausführen"
3. Überprüfe Ergebnis und Logs

### 3. Logs überprüfen

```sql
-- In Supabase SQL Editor
SELECT * FROM reminder_logs
ORDER BY sent_at DESC
LIMIT 50;
```

## Konfiguration

### Erinnerungs-Einstellungen (pro Tenant)

Gespeichert in `tenant_settings` mit `setting_key = 'reminder_settings'`:

```json
{
  "is_enabled": true,
  "first_after_hours": 24,
  "second_after_hours": 48,
  "final_after_hours": 72,
  "first_email": true,
  "first_sms": false,
  "first_push": false,
  "second_email": true,
  "second_sms": true,
  "second_push": false,
  "final_email": true,
  "final_sms": true,
  "final_push": true
}
```

### Templates (pro Tenant + Kanal + Stufe)

Gespeichert in `reminder_templates`:

```sql
INSERT INTO reminder_templates (
  tenant_id,
  channel,
  stage,
  language,
  subject,
  body
) VALUES (
  'your-tenant-id',
  'email',
  'first',
  'de',
  'Terminbestätigung erforderlich',
  'Hallo {{student_name}}, ...'
);
```

## Monitoring

### Wichtige Metriken

1. **Versendete Erinnerungen**
   ```sql
   SELECT COUNT(*) FROM reminder_logs
   WHERE sent_at > NOW() - INTERVAL '24 hours';
   ```

2. **Erfolgsrate**
   ```sql
   SELECT 
     status,
     COUNT(*) as count,
     ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
   FROM reminder_logs
   WHERE sent_at > NOW() - INTERVAL '7 days'
   GROUP BY status;
   ```

3. **Erinnerungen pro Kanal**
   ```sql
   SELECT 
     channel,
     COUNT(*) as count
   FROM reminder_logs
   WHERE sent_at > NOW() - INTERVAL '7 days'
   GROUP BY channel;
   ```

4. **Offene Zahlungen mit Erinnerungen**
   ```sql
   SELECT 
     p.id,
     p.created_at,
     p.last_reminder_sent_at,
     p.last_reminder_stage,
     u.email
   FROM payments p
   JOIN users u ON p.user_id = u.id
   WHERE p.payment_status = 'pending'
   AND p.last_reminder_sent_at IS NOT NULL
   ORDER BY p.last_reminder_sent_at DESC;
   ```

## Troubleshooting

### Problem: Keine Erinnerungen werden gesendet

**Lösung:**
1. Prüfe ob Erinnerungen aktiviert sind: Admin-Profil → Erinnerungen
2. Prüfe Cron-Job Logs: `/admin/reminder-test`
3. Prüfe ob pending Zahlungen existieren:
   ```sql
   SELECT COUNT(*) FROM payments WHERE payment_status = 'pending';
   ```

### Problem: Templates werden nicht gefunden

**Lösung:**
1. Führe Seed-Script aus: `POST /api/reminder/seed-templates`
2. Prüfe Templates in Datenbank:
   ```sql
   SELECT * FROM reminder_templates WHERE tenant_id = 'your-tenant-id';
   ```

### Problem: SMS werden nicht gesendet

**Lösung:**
1. Prüfe SMS-Service Konfiguration in `composables/useSmsService.ts`
2. Prüfe Twilio Credentials in Supabase Edge Function
3. Überprüfe SMS-Logs:
   ```sql
   SELECT * FROM sms_logs ORDER BY sent_at DESC LIMIT 10;
   ```

### Problem: Email werden nicht gesendet

**Lösung:**
1. Implementiere Email-Service (aktuell nur Logging)
2. Integriere Email-Provider (z.B. SendGrid, Mailgun, Resend)
3. Update `sendEmailReminder` in `useReminderService.ts`

## Nächste Schritte

1. **Email-Integration**: Implementiere tatsächlichen Email-Versand
2. **Push-Notifications**: Integriere Push-Service (Firebase, OneSignal)
3. **Analytics**: Dashboard für Erinnerungs-Statistiken
4. **A/B Testing**: Teste verschiedene Templates
5. **Automatische Termin-Löschung**: Nach finaler Warnung ohne Zahlung

## Support

Bei Fragen oder Problemen:
1. Überprüfe Logs in `/admin/reminder-test`
2. Prüfe Datenbank-Logs in Supabase
3. Kontaktiere Support-Team

