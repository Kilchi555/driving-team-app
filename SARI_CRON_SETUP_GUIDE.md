# SARI Cron Job Setup Guide

## Endpoint
```
POST /api/cron/sync-sari-courses
```

## What It Does

The cron job automatically syncs SARI courses for **all tenants with SARI enabled**:

1. Finds all tenants where `sari_enabled = true`
2. For each tenant:
   - Syncs VKU courses
   - Syncs PGS courses
   - Updates `sari_last_sync_at` timestamp
3. Returns summary of results

## Features

✅ **Multi-Tenant**: Syncs all enabled tenants in one run
✅ **Error Handling**: Continues if one tenant fails, logs failures
✅ **Logging**: Detailed logs for debugging
✅ **Timestamp Tracking**: Updates last sync time per tenant
✅ **No Authentication**: Uses service role (internal only)

## Setup Options

### Option 1: Vercel Cron (Recommended for Preview/Production)

In `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-sari-courses",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

This runs **every hour**.

### Option 2: EasyCron (External Service)

1. Go to https://www.easycron.com/
2. Create new cron job
3. URL: `https://your-domain.com/api/cron/sync-sari-courses`
4. Schedule: Every 6 hours (0 */6 * * *)
5. HTTP Method: POST

### Option 3: Cron-job.org (External Service)

1. Go to https://cron-job.org/
2. Create new cronjob
3. URL: `https://your-domain.com/api/cron/sync-sari-courses`
4. Execution time: Every 6 hours
5. HTTP Method: POST

### Option 4: Local Testing

```bash
# Test the cron job manually
curl -X POST http://localhost:3000/api/cron/sync-sari-courses
```

## Schedule Recommendations

| Frequency | Use Case |
|-----------|----------|
| Every 30 min | Very high-volume courses, real-time changes |
| **Every hour** | **Default (recommended)** |
| Every 6 hours | Standard, less frequent updates |
| Every 12 hours | Low-volume, stable courses |
| Daily (1x/day) | Minimal changes expected |

**Default**: `0 * * * *` (Every hour)

## Cron Expression Format

Standard crontab format:
```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday - Saturday)
│ │ │ │ │
│ │ │ │ │
* * * * *

Examples:
0 */6 * * *    = Every 6 hours
0 * * * *      = Every hour
0 0 * * *      = Daily at midnight
*/30 * * * *   = Every 30 minutes
0 2 * * *      = Daily at 2 AM
```

## Response Format

```json
{
  "success": true,
  "tenants_processed": 5,
  "total_syncs": 10,
  "failed_tenants": []
}
```

Or with errors:
```json
{
  "success": false,
  "tenants_processed": 5,
  "total_syncs": 8,
  "failed_tenants": [
    {
      "tenant_id": "uuid",
      "tenant_name": "Driving School ABC",
      "error": "Incomplete SARI credentials"
    }
  ]
}
```

## Monitoring

### Check Last Sync Time
```sql
SELECT name, sari_last_sync_at, sari_enabled
FROM tenants
WHERE sari_enabled = true
ORDER BY sari_last_sync_at DESC;
```

### View Recent Sync Logs
```sql
SELECT 
  t.name,
  ssl.operation,
  ssl.status,
  ssl.result,
  ssl.error_message,
  ssl.created_at
FROM sari_sync_logs ssl
JOIN tenants t ON t.id = ssl.tenant_id
ORDER BY ssl.created_at DESC
LIMIT 50;
```

### Count Syncs Per Tenant (Last 24h)
```sql
SELECT 
  t.name,
  COUNT(*) as sync_count,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed
FROM sari_sync_logs ssl
JOIN tenants t ON t.id = ssl.tenant_id
WHERE ssl.created_at > NOW() - INTERVAL '24 hours'
GROUP BY t.id, t.name
ORDER BY sync_count DESC;
```

## Troubleshooting

### Cron not running?

1. **Verify cron job is configured** (Vercel/EasyCron/etc)
2. **Check logs**: `POST /api/admin/error-logs` or view function logs
3. **Test manually**: `curl -X POST http://localhost:3000/api/cron/sync-sari-courses`
4. **Verify tenants have SARI enabled**: `SELECT * FROM tenants WHERE sari_enabled = true`
5. **Check credentials are complete**: All 4 SARI fields must be filled

### Sync failing for specific tenant?

1. Check `sari_sync_logs` for error message
2. Verify credentials haven't expired
3. Test connection: `POST /api/sari/test-connection`
4. Check network/firewall access to SARI

### High failure rate?

- Credentials might be wrong
- SARI API might be down
- Network issues
- Check SARI status page: https://www.vku-pgs.asa.ch/

## Security

✅ **Endpoint is internal-only** (service role)
✅ **No authentication required** (trusted cron service)
✅ **Logs all operations** (audit trail)
✅ **Handles tenant isolation** (per-tenant processing)

## Scaling Considerations

If you have **many tenants**:

1. **Consider increasing frequency** to catch more updates
2. **Monitor sync duration** - if taking >1 min per tenant, reduce frequency
3. **Add error retry logic** - currently no retries on failure
4. **Consider batch size** - currently processes all in one job

## Vercel Configuration Example

Create/update `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-sari-courses",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

Then redeploy:
```bash
vercel deploy --prod
```

## Testing in Development

```bash
# Start dev server
npm run dev

# Test cron job (in another terminal)
curl -X POST http://localhost:3000/api/cron/sync-sari-courses

# Check logs
tail -f .output/logs  # or wherever logs are
```

## Expected Behavior

### First Run
- All tenants with SARI enabled will sync
- Courses will be created in database
- Logs will show operation

### Subsequent Runs
- Only new/updated courses will be synced
- Logs will show incremental updates
- `sari_last_sync_at` timestamp updates

### On Error
- Failed tenant is logged but doesn't stop other tenants
- Error message is recorded in `sari_sync_logs`
- Job still returns 200 (cron service can retry if needed)

## Disabling SARI Sync

To stop syncing for a tenant:
```sql
UPDATE tenants
SET sari_enabled = false
WHERE id = 'tenant_id';
```

The cron job will skip it on next run.

## Re-enabling SARI Sync

```sql
UPDATE tenants
SET sari_enabled = true
WHERE id = 'tenant_id';
```

Cron job will resume syncing on next run.

## Summary

The SARI cron job runs every 6 hours and:
1. Finds all enabled tenants
2. Syncs VKU + PGS courses for each
3. Logs results and updates timestamps
4. Handles errors gracefully

Set it up once, and courses sync automatically! 🤖

