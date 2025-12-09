# Cron Job Manuell Testen

## Option 1: Über die Admin-UI (empfohlen)
Falls Sie eine Admin-Seite haben:
- Gehen Sie zu `/admin/cron-status` oder `/admin/test-automatic-payments`
- Klicken Sie auf "Run Now" oder "Manuell Ausführen"

## Option 2: Via cURL
```bash
# Ersetzen Sie YOUR_AUTH_TOKEN mit Ihrem tatsächlichen Bearer Token
curl -X POST https://your-app.vercel.app/api/cron/process-automatic-payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

## Option 3: Via Browser Console (wenn eingeloggt als Admin)
```javascript
// In der Browser-Konsole (F12)
const response = await fetch('/api/cron/process-automatic-payments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
  }
});
const result = await response.json();
logger.debug(result);
```

## Was Sie sehen sollten

### Erfolgreiche Antwort:
```json
{
  "success": true,
  "processed": 4,
  "failed": 0,
  "total": 4,
  "deleted": 0
}
```

### Mit Fehlern:
```json
{
  "success": true,
  "processed": 3,
  "failed": 1,
  "total": 4,
  "errors": [
    {
      "paymentId": "xxx-xxx-xxx",
      "error": "Transaction state: FAILED"
    }
  ]
}
```

## Logs überprüfen

### Vercel Logs:
```bash
vercel logs --follow
```

### Oder in Vercel Dashboard:
1. Gehe zu https://vercel.com/your-project
2. Klicke auf "Deployments"
3. Wähle das aktuelle Deployment
4. Klicke auf "Functions" Tab
5. Suche nach `/api/cron/process-automatic-payments`

## Was der Cron überprüft

Der Cron Job sucht nach Zahlungen mit:
- ✅ `payment_status = 'authorized'`
- ✅ `automatic_payment_consent = true`
- ✅ `automatic_payment_processed = false`
- ✅ `scheduled_payment_date <= NOW()`
- ✅ `payment_method_id IS NOT NULL`
- ✅ `wallee_transaction_id IS NOT NULL`
- ✅ Appointment status = 'scheduled' oder 'completed'

## Troubleshooting

### Zahlung wird nicht verarbeitet?
Führen Sie `check_specific_authorized_payments.sql` Step 3 aus, um zu sehen, welche Bedingung fehlt.

### Fehler "No payment method"?
```sql
-- Überprüfen Sie die payment_method_id
SELECT id, payment_method_id, wallee_transaction_id
FROM payments
WHERE payment_status = 'authorized';
```

### Fehler "No transaction ID"?
Die Zahlung wurde autorisiert, aber `wallee_transaction_id` fehlt. Das sollte nicht passieren - prüfen Sie die Autorisierung.

