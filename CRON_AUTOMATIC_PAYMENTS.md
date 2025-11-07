# Automatische Zahlungen - Scheduler

## Übersicht

Der Scheduler (`/api/cron/process-automatic-payments`) verarbeitet automatische Abbuchungen X Stunden vor einem Termin.

## Funktionsweise

1. **Prüft fällige Zahlungen**: Findet alle `payments` mit:
   - `automatic_payment_consent = true`
   - `automatic_payment_processed = false`
   - `scheduled_payment_date <= now`
   - `payment_method_id IS NOT NULL`

2. **Verarbeitet jede Zahlung**:
   - Lädt Wallee-Token aus `customer_payment_methods`
   - Erstellt Wallee Transaction mit gespeichertem Token
   - Wallee führt automatische Abbuchung durch
   - Aktualisiert Payment-Status in der Datenbank

3. **Status-Updates**:
   - ✅ Erfolgreich: `automatic_payment_processed = true`, `payment_status = 'completed'`
   - ❌ Fehlgeschlagen: `payment_status = 'failed'`, Fehler in `metadata`
   - ⏳ In Verarbeitung: Wird via Webhook aktualisiert

## Setup

### Option 1: Vercel Cron Jobs

Füge zu `vercel.json` hinzu:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-automatic-payments",
      "schedule": "0 * * * *"
    }
  ]
}
```

Dies führt den Scheduler **jede Stunde** aus.

### Option 2: Supabase Edge Functions + pg_cron

In Supabase SQL Editor:

```sql
-- Erstelle pg_cron Job (läuft jede Stunde)
SELECT cron.schedule(
  'process-automatic-payments',
  '0 * * * *', -- Jede Stunde
  $$
  SELECT net.http_post(
    url := 'https://deine-app.vercel.app/api/cron/process-automatic-payments',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

### Option 3: Externer Cron Service

Verwende Services wie:
- **cron-job.org**: HTTP Request zu `/api/cron/process-automatic-payments`
- **EasyCron**: Ähnlich
- **GitHub Actions**: Scheduled workflows

## Endpoint-Details

**URL**: `/api/cron/process-automatic-payments`  
**Method**: `POST`  
**Auth**: Optional (kann mit API-Key geschützt werden)

**Response**:
```json
{
  "success": true,
  "processed": 5,
  "failed": 1,
  "total": 6,
  "errors": [
    {
      "paymentId": "xxx",
      "error": "Transaction state: FAILED"
    }
  ]
}
```

## Sicherheit

**Empfehlung**: Schütze den Endpoint mit einem API-Key:

```typescript
// In process-automatic-payments.post.ts
const apiKey = getHeader(event, 'x-api-key')
if (apiKey !== process.env.CRON_API_KEY) {
  throw createError({
    statusCode: 401,
    statusMessage: 'Unauthorized'
  })
}
```

## Monitoring

Der Scheduler loggt:
- Anzahl gefundener fälliger Zahlungen
- Erfolgreich verarbeitete Zahlungen
- Fehlgeschlagene Zahlungen mit Fehlerdetails
- Wallee Transaction IDs für Nachverfolgung

## Webhook-Integration

Der Wallee-Webhook (`/api/webhooks/wallee-payment`) aktualisiert automatisch:
- Zahlungen die noch "in processing" sind
- Finale Status-Updates (SUCCESSFUL, FAILED, etc.)

## Fehlerbehandlung

Bei Fehlern:
1. Zahlung wird als `failed` markiert
2. Fehler wird in `metadata.automatic_payment_failed` gespeichert
3. Retry-Count wird erhöht
4. Fehler wird in Response geloggt

## Testen

Manuelle Ausführung:
```bash
curl -X POST https://deine-app.vercel.app/api/cron/process-automatic-payments \
  -H "Content-Type: application/json"
```

Oder direkt in der App:
```typescript
await $fetch('/api/cron/process-automatic-payments', { method: 'POST' })
```

