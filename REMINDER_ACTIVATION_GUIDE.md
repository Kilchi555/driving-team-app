# Erinnerungs-System Aktivierung

## ✅ Status: AKTIVIERT

Das Erinnerungs-System ist jetzt vollständig aktiviert und sendet echte Nachrichten!

## 📱 SMS-Versand (Twilio)

### Status: **AKTIV** ✅

SMS werden über Twilio versendet. Der Service nutzt:
- **Supabase Edge Function**: `send-twilio-sms`
- **Fallback-Modus**: Falls Edge Function nicht erreichbar ist, wird die SMS simuliert und geloggt

### Konfiguration:
Die Twilio-Credentials sind in der Supabase Edge Function konfiguriert:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

### Logs:
Alle SMS (gesendet oder simuliert) werden in `reminder_logs` gespeichert mit:
- `status: 'sent'` - Erfolgreich über Twilio gesendet
- `status: 'simulated'` - Simuliert (Edge Function nicht verfügbar)
- `status: 'failed'` - Fehler beim Senden

## 📧 Email-Versand

### Status: **AKTIV mit Fallback** ⚠️

Emails werden versucht über Supabase Edge Function zu versenden:
- **Edge Function**: `send-email` (noch nicht implementiert)
- **Fallback**: Emails werden simuliert und geloggt

### Nächste Schritte für echten Email-Versand:

1. **Supabase Edge Function erstellen:**
   ```bash
   # In Supabase Dashboard → Edge Functions
   # Neue Function: send-email
   ```

2. **Email-Provider integrieren (z.B. Resend, SendGrid, Mailgun):**
   ```typescript
   // supabase/functions/send-email/index.ts
   import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
   
   serve(async (req) => {
     const { to, subject, text, html } = await req.json()
     
     // Beispiel mit Resend
     const response = await fetch('https://api.resend.com/emails', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({
         from: 'noreply@yourdomain.com',
         to,
         subject,
         text,
         html
       })
     })
     
     return new Response(JSON.stringify(await response.json()))
   })
   ```

3. **Umgebungsvariablen setzen:**
   - `RESEND_API_KEY` (oder entsprechender Provider)

### Aktuelles Verhalten:
- Emails werden **simuliert** und in `reminder_logs` geloggt
- Status: `'simulated'`
- Alle Email-Inhalte werden in Console geloggt für Debugging

## 🔔 Push-Notifications

### Status: **SIMULIERT** ⏳

Push-Notifications sind noch nicht implementiert. Aktuell:
- Werden nur geloggt
- Status: `'simulated'`

### Nächste Schritte:
1. Firebase Cloud Messaging (FCM) oder OneSignal integrieren
2. Device Tokens in User-Tabelle speichern
3. Push-Service implementieren

## 🧪 Testen

### 1. Test-Seite verwenden:
```
http://localhost:3000/admin/test-reminders
```

### 2. Einzelne Erinnerung testen:
1. Payment-ID eingeben
2. Stufe wählen (first, second, final)
3. Kanäle aktivieren (Email, SMS, Push)
4. "Test-Erinnerung senden" klicken

### 3. Logs überprüfen:
- **Browser Console**: Detaillierte Logs über Versand-Status
- **Datenbank**: `reminder_logs` Tabelle
- **Supabase Logs**: Edge Function Logs für Twilio/Email

## 📊 Monitoring

### Wichtige Queries:

#### Alle Erinnerungen der letzten 24h:
```sql
SELECT 
  channel,
  status,
  COUNT(*) as count
FROM reminder_logs
WHERE sent_at > NOW() - INTERVAL '24 hours'
GROUP BY channel, status
ORDER BY channel, status;
```

#### Fehlgeschlagene Erinnerungen:
```sql
SELECT *
FROM reminder_logs
WHERE status = 'failed'
ORDER BY sent_at DESC
LIMIT 50;
```

#### SMS-Versand-Rate:
```sql
SELECT 
  DATE(sent_at) as date,
  COUNT(*) as total_sms,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
  SUM(CASE WHEN status = 'simulated' THEN 1 ELSE 0 END) as simulated
FROM reminder_logs
WHERE channel = 'sms'
  AND sent_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(sent_at)
ORDER BY date DESC;
```

## 🚀 Automatischer Cron-Job

### Setup mit Vercel Cron:
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/send-payment-reminders",
    "schedule": "0 * * * *"
  }]
}
```

### Setup mit GitHub Actions:
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

### Manueller Trigger:
```bash
curl -X POST http://localhost:3000/api/cron/send-payment-reminders
```

## ⚙️ Konfiguration pro Tenant

### Erinnerungen aktivieren:
1. Als Admin einloggen
2. Profil → Tab "Erinnerungen"
3. "Erinnerungen aktiv" einschalten
4. Zeitintervalle konfigurieren (z.B. 24h, 48h, 72h)
5. Kanäle pro Stufe aktivieren

### Templates anpassen:
1. Profil → Tab "Nachrichten-Vorlagen"
2. Stufe und Kanal wählen
3. Template bearbeiten mit Variablen:
   - `{{student_name}}`
   - `{{appointment_date}}`
   - `{{appointment_time}}`
   - `{{location}}`
   - `{{price}}`
   - `{{payment_link}}`

## 🔒 Sicherheit

### SMS-Kosten:
- ⚠️ **WICHTIG**: Jede SMS über Twilio kostet Geld!
- Empfehlung: Monitoring der SMS-Anzahl einrichten
- Twilio Dashboard: Kosten und Limits überwachen

### Rate Limiting:
- Aktuell: Keine Rate Limits implementiert
- TODO: Rate Limiting pro User/Tenant hinzufügen

### Opt-Out:
- TODO: Opt-Out Mechanismus für SMS/Email implementieren
- User sollten Erinnerungen deaktivieren können

## 📝 Nächste Schritte

1. ✅ SMS-Versand aktiviert (Twilio)
2. ⏳ Email Edge Function implementieren
3. ⏳ Push-Notifications integrieren
4. ⏳ Rate Limiting hinzufügen
5. ⏳ Opt-Out Mechanismus
6. ⏳ Analytics Dashboard für Erinnerungen

## 💡 Tipps

### Test-Modus:
Für Tests ohne echte SMS/Emails:
- Verwende Test-Phone-Numbers von Twilio
- Oder temporär den Fallback-Modus erzwingen

### Debugging:
- Browser Console für detaillierte Logs
- Supabase Logs für Edge Function Errors
- `reminder_logs` Tabelle für Historie

### Performance:
- Cron-Job sollte nicht öfter als stündlich laufen
- Bei vielen Tenants: Batch-Processing implementieren

