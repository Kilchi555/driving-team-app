# Manual Cron Job Trigger

## Problem
Cron Job läuft nicht automatisch oder hat Fehler. Payments bleiben in "authorized" Status stecken.

## Sofort-Lösung: Manuell triggern

### Option 1: Via Browser/Postman (als Admin)

1. **Login als Admin** in der App
2. **Kopiere dein Auth Token** aus den Browser DevTools:
   ```javascript
   // In Browser Console:
   localStorage.getItem('supabase.auth.token')
   ```

3. **Sende POST Request:**
   ```bash
   curl -X POST https://deine-app.vercel.app/api/cron/process-automatic-payments \
     -H "Authorization: Bearer DEIN_AUTH_TOKEN" \
     -H "Content-Type: application/json"
   ```

### Option 2: Via Vercel Dashboard

1. Gehe zu **Vercel Dashboard**
2. Wähle dein **Projekt**
3. Gehe zu **Cron Jobs**
4. Klicke auf **"process-automatic-payments"**
5. Klicke auf **"Run Now"** oder **"Trigger"**

### Option 3: Via Supabase SQL

```sql
-- Manuell das Payment capturen (nur für Notfälle!)
-- Ersetze die Payment ID mit der tatsächlichen ID

-- 1. Prüfe den aktuellen Status
SELECT 
  id,
  payment_status,
  wallee_transaction_id,
  scheduled_payment_date,
  automatic_payment_processed
FROM payments
WHERE id = 'PAYMENT_ID_HIER';

-- 2. Falls du die Transaction ID hast, kannst du sie manuell in Wallee capturen
-- Gehe zu Wallee Dashboard → Transaction → Capture
```

## Debugging: Warum läuft der Cron nicht?

### Check 1: Vercel Cron Logs

1. Vercel Dashboard → Project → Logs
2. Filter nach "cron"
3. Prüfe ob Fehler auftreten

### Check 2: Vercel Cron Jobs Status

1. Vercel Dashboard → Project → Cron Jobs
2. Prüfe "Last Run" und "Status"
3. Wenn "Never run" → Cron ist nicht aktiv!

### Check 3: Vercel Plan

**Wichtig:** Cron Jobs sind nur in **Pro** und **Enterprise** Plänen verfügbar!

- **Hobby Plan**: ❌ Keine Cron Jobs
- **Pro Plan**: ✅ Cron Jobs verfügbar
- **Enterprise**: ✅ Cron Jobs verfügbar

### Check 4: vercel.json deployed?

```bash
# Prüfe ob vercel.json im Deployment ist
git log --oneline --all -- vercel.json

# Prüfe letzten Commit
git show HEAD:vercel.json
```

## Alternative: Externer Cron Service

Falls Vercel Cron nicht verfügbar ist:

### Option A: cron-job.org

1. Gehe zu https://cron-job.org
2. Erstelle kostenlosen Account
3. Neuer Cron Job:
   - **URL**: `https://deine-app.vercel.app/api/cron/process-automatic-payments`
   - **Schedule**: `0 * * * *` (jede Stunde)
   - **Method**: POST
   - **Headers**: `x-cron-secret: DEIN_SECRET` (optional)

### Option B: EasyCron

1. Gehe zu https://www.easycron.com
2. Ähnliche Konfiguration wie cron-job.org

### Option C: GitHub Actions

Erstelle `.github/workflows/cron.yml`:

```yaml
name: Cron Jobs

on:
  schedule:
    - cron: '0 * * * *'  # Jede Stunde
  workflow_dispatch:  # Manueller Trigger

jobs:
  process-payments:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Payment Processing
        run: |
          curl -X POST https://deine-app.vercel.app/api/cron/process-automatic-payments \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}"
```

## Monitoring: Stelle sicher dass Cron läuft

### SQL Query für tägliche Prüfung

```sql
-- Zeige alle überfälligen Payments
SELECT 
  p.id,
  p.payment_status,
  p.scheduled_payment_date,
  EXTRACT(EPOCH FROM (NOW() - p.scheduled_payment_date)) / 3600 as hours_overdue,
  a.start_time as appointment_time,
  u.first_name || ' ' || u.last_name as customer
FROM payments p
LEFT JOIN appointments a ON p.appointment_id = a.id
LEFT JOIN users u ON p.user_id = u.id
WHERE p.payment_status = 'authorized'
  AND p.automatic_payment_processed = false
  AND p.scheduled_payment_date < NOW() - INTERVAL '1 hour'
ORDER BY hours_overdue DESC;
```

### Alert einrichten

Erstelle einen Alert in Supabase oder via Email:

```sql
-- Supabase Function für täglichen Alert
CREATE OR REPLACE FUNCTION check_overdue_payments()
RETURNS void AS $$
DECLARE
  overdue_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO overdue_count
  FROM payments
  WHERE payment_status = 'authorized'
    AND automatic_payment_processed = false
    AND scheduled_payment_date < NOW() - INTERVAL '1 hour';
  
  IF overdue_count > 0 THEN
    -- Send alert (implement email/notification)
    RAISE NOTICE 'ALERT: % overdue payments found!', overdue_count;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

## Sofort-Aktion für aktuelles Problem

```bash
# 1. Manuell Cron triggern
curl -X POST https://deine-app.vercel.app/api/cron/process-automatic-payments \
  -H "Authorization: Bearer DEIN_TOKEN"

# 2. Prüfe Logs
# Vercel Dashboard → Logs

# 3. Prüfe ob Payment jetzt completed ist
# In Supabase SQL Editor
```

## Langfristige Lösung

1. ✅ **Stelle sicher Vercel Pro Plan** aktiv ist
2. ✅ **Monitoring einrichten** (täglicher Check)
3. ✅ **Backup Cron** via cron-job.org
4. ✅ **Alert bei überfälligen Payments**

