# Local Time Migration Guide für Payments-Tabelle

## Zusammenfassung

Die `payments`-Tabelle wurde komplett auf **Local Time** (Swiss Time) umgestellt, um konsistent mit 90% der restlichen App zu sein. Keine Timezone-Konvertierungen mehr nötig!

## Was wurde geändert?

### 1. Datenbank-Migration (`convert_payments_to_local_time.sql`)
- Konvertiert alle timestamp-Spalten von `TIMESTAMP WITH TIME ZONE` (UTC) zu `TIMESTAMP` (local)
- Bestehende Daten werden von UTC zu Swiss Local Time (Europe/Zurich) konvertiert
- Betrifft folgende Spalten:
  - `created_at`
  - `updated_at`
  - `paid_at`
  - `refunded_at`
  - `scheduled_payment_date`
  - `scheduled_authorization_date`
  - `automatic_payment_processed_at`
  - `automatic_payment_consent_at`
  - `due_date`

### 2. Code-Änderungen
Alle Server-API-Endpunkte wurden angepasst, um `toLocalTimeString()` statt `toISOString()` zu verwenden:

✅ **Angepasste Dateien:**
- `server/api/payments/create.post.ts`
- `server/api/payments/confirm-cash.post.ts`
- `server/api/payments/process-immediate.post.ts`
- `server/api/cron/process-automatic-payments.post.ts`
- `server/api/wallee/authorize-payment.post.ts`
- `server/api/wallee/capture-payment.post.ts`
- `server/api/wallee/void-payment.post.ts`

### 3. Funktionsweise
Die Funktion `toLocalTimeString()` aus `utils/dateUtils.ts`:
```typescript
// Alt (UTC):
updated_at: new Date().toISOString()  
// → "2025-11-12T09:48:05.000Z" (UTC)

// Neu (Local):
updated_at: toLocalTimeString(new Date())  
// → "2025-11-12T10:48:05" (Swiss Local Time, kein Z)
```

## Migrations-Schritte

### Schritt 1: Backup erstellen
```bash
# In Supabase Dashboard: Settings → Backups → Create Backup
```

### Schritt 2: Migration ausführen
1. Öffne Supabase SQL Editor
2. Führe `convert_payments_to_local_time.sql` aus
3. Prüfe die VERIFICATION-Ausgaben (sollten alle ✅ MATCH zeigen)

### Schritt 3: Code deployen
```bash
# Lokale Tests (optional)
npm run dev

# Deploy zu Vercel
git add .
git commit -m "Migrate payments table to local time"
git push
```

### Schritt 4: Verifizierung
Führe diese SQL-Abfrage aus, um zu prüfen, ob alles korrekt ist:
```sql
-- Check column types
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'payments'
  AND column_name IN ('created_at', 'updated_at', 'scheduled_payment_date')
ORDER BY ordinal_position;

-- Should show: data_type = "timestamp without time zone"
```

## Was ändert sich für den Cron Job?

**Nichts!** Der Cron Job funktioniert weiterhin korrekt:
- `NOW()` gibt jetzt Swiss Local Time zurück (statt UTC)
- Vergleiche wie `.lte('scheduled_payment_date', now)` funktionieren identisch
- Keine Zeitverschiebung mehr zwischen angezeigten und gespeicherten Zeiten

## Vorteile

✅ **Keine Timezone-Konvertierung** mehr nötig  
✅ **Konsistent** mit 90% der App  
✅ **Einfacher zu debuggen** (Zeit in DB = Zeit in UI)  
✅ **Keine Sommerzeit-Probleme** zwischen DB und Anzeige  

## Troubleshooting

### Problem: Cron Job findet keine fälligen Zahlungen
**Lösung:** Prüfe, ob die Migration korrekt ausgeführt wurde:
```sql
SELECT 
  scheduled_payment_date,
  NOW() as current_time,
  scheduled_payment_date <= NOW() as is_due
FROM payments
WHERE payment_status = 'authorized'
ORDER BY scheduled_payment_date ASC
LIMIT 5;
```

### Problem: Zeiten werden falsch angezeigt
**Lösung:** Stelle sicher, dass du `convert_payments_to_local_time.sql` ausgeführt hast. Die alten UTC-Zeiten müssen zu Local Time konvertiert werden.

### Problem: Neue Payments haben falsche Zeiten
**Lösung:** Prüfe, ob alle Code-Änderungen deployed wurden. Suche nach verbleibenden `.toISOString()` Aufrufen:
```bash
grep -r "toISOString()" server/api/payments/ server/api/wallee/ server/api/cron/
```

## Nächste Schritte

Nach erfolgreicher Migration kannst du die anderen Tabellen prüfen:
- `appointments` (wahrscheinlich schon local time?)
- `users`
- Andere Tabellen nach Bedarf

## Rollback (falls nötig)

Falls Probleme auftreten, kann die Migration rückgängig gemacht werden:
```sql
-- Restore from backup (in Supabase Dashboard)
-- ODER manuell zurück zu UTC:
ALTER TABLE payments 
ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE 
USING (created_at AT TIME ZONE 'Europe/Zurich');

-- Wiederholen für alle anderen Spalten...
```

---

**Status:** ✅ Bereit für Migration  
**Datum:** 2025-11-12  
**Geschätzte Downtime:** < 1 Minute

