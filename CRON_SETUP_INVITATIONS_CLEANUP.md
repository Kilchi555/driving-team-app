# SETUP: Cleanup Cron Job für Expired Invitations

## API Endpoint
`POST /api/cron/cleanup-expired-invitations`

## Was macht der Job?
- Findet alle `staff_invitations` mit `status = 'pending'` und `expires_at < now()`
- Archiviert (status = 'expired') Einladungen < 30 Tage alt
- Löscht Einladungen >= 30 Tage alt
- Loggt alle Aktionen im Audit-Log

## Empfohlene Ausführung
**Täglich um 2:00 Uhr**

---

## Option 1: Vercel Cron Jobs (Empfohlen)

### 1. Erstelle `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-expired-invitations",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### 2. Schütze den Endpoint:
```typescript
// In server/api/cron/cleanup-expired-invitations.post.ts
export default defineEventHandler(async (event) => {
  // Verify cron secret
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }
  
  // ... rest of code
})
```

### 3. Setze Environment Variable:
```bash
# In Vercel Dashboard oder .env
CRON_SECRET=your-random-secret-key-here
```

---

## Option 2: GitHub Actions

### Erstelle `.github/workflows/cleanup-invitations.yml`:
```yaml
name: Cleanup Expired Invitations

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2:00 AM UTC
  workflow_dispatch:  # Manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Call cleanup endpoint
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-app.com/api/cron/cleanup-expired-invitations
```

---

## Option 3: Manueller Aufruf (Testing)

```bash
# Via curl
curl -X POST \
  -H "Authorization: Bearer your-cron-secret" \
  https://your-app.com/api/cron/cleanup-expired-invitations

# Response:
{
  "success": true,
  "message": "Cleanup completed successfully",
  "total_expired": 15,
  "archived": 8,
  "deleted": 7,
  "duration_ms": 342
}
```

---

## Monitoring

### 1. Check Audit Logs:
```sql
SELECT * FROM audit_logs 
WHERE action = 'invitations_cleanup'
ORDER BY created_at DESC 
LIMIT 10;
```

### 2. Check Archived Invitations:
```sql
SELECT COUNT(*) FROM staff_invitations 
WHERE status = 'expired';
```

### 3. Check Pending Expired (should be 0 after cleanup):
```sql
SELECT COUNT(*) FROM staff_invitations 
WHERE status = 'pending' 
AND expires_at < now();
```

---

## Troubleshooting

### Job nicht ausgeführt?
1. Check Vercel Cron Logs: `vercel logs --follow`
2. Verify `CRON_SECRET` environment variable
3. Check API response manually via curl

### Zu viele Einladungen?
- Reduzie expiration von 7 auf 3 Tage in `staff/invite.post.ts`
- Führe Cleanup öfter aus (z.B. 2x täglich)

### Performance Issues?
- Add index: `CREATE INDEX idx_invitations_cleanup ON staff_invitations(status, expires_at, created_at);`
- Batch-Delete in chunks of 100

---

## Alternative: Supabase Database Function

Kann auch direkt in Supabase als SQL Function implementiert werden:

```sql
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS TABLE(archived_count INT, deleted_count INT) AS $$
DECLARE
  v_archived_count INT;
  v_deleted_count INT;
BEGIN
  -- Archive recent expired (< 30 days)
  UPDATE staff_invitations
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending'
    AND expires_at < now()
    AND created_at > (now() - INTERVAL '30 days');
  
  GET DIAGNOSTICS v_archived_count = ROW_COUNT;

  -- Delete old expired (>= 30 days)
  DELETE FROM staff_invitations
  WHERE status = 'pending'
    AND expires_at < now()
    AND created_at <= (now() - INTERVAL '30 days');
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN QUERY SELECT v_archived_count, v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Run via pg_cron extension (if available)
SELECT cron.schedule('cleanup-invitations', '0 2 * * *', 'SELECT cleanup_expired_invitations()');
```

---

## Empfehlung

Für deine App: **Option 1 (Vercel Cron Jobs)**
- Einfachste Integration
- Native Vercel Support
- Automatisches Monitoring
- Kein zusätzlicher Service notwendig

