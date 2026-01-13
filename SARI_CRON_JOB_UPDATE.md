# SARI Integration Update - Cron Job & Architecture Adjustments

## What Changed

### Original Plan (Phase 1-4)
- Phase 1: Foundation (✅ DONE)
- Phase 2: Admin UI (Settings + Sync Page)
- Phase 3: Cron Job for auto-sync
- Phase 4: Testing & Deployment

### New Plan (Accelerated)
- Phase 1: Foundation ✅ DONE
- **Phase 2 (NEW)**: Auto-Sync via Cron Job ✅ DONE
- Phase 3: SARI Credentials in Security Tab
- Phase 4: Manual Sync Page (optional)
- Phase 5: Testing & Deployment

---

## Why Cron Job First?

**User Request**: "Ich will dass sich die SARI Daten automatisch synchen!"

**Benefits**:
1. ✅ No manual intervention needed
2. ✅ Consistent, reliable sync schedule
3. ✅ All tenants sync together
4. ✅ Simpler than building UI for manual triggers
5. ✅ Audit trail via `sari_sync_logs`

---

## What Was Built

### New Endpoint: Cron Job

**File**: `server/api/cron/sync-sari-courses.post.ts`

**Purpose**: Automatically sync SARI courses for all enabled tenants

**How It Works**:
1. Fetches all tenants with `sari_enabled = true`
2. For each tenant:
   - Creates SARIClient with tenant's credentials
   - Creates SARISyncEngine
   - Syncs VKU courses
   - Syncs PGS courses
   - Updates `sari_last_sync_at` timestamp
3. Returns results summary
4. Logs all operations and errors

**Error Handling**:
- If one tenant fails → continues to next
- Records failures but doesn't stop job
- Detailed error logging for debugging

**Response**:
```json
{
  "success": true,
  "tenants_processed": 5,
  "total_syncs": 10,
  "failed_tenants": []
}
```

---

## How to Setup

### Option 1: Vercel Cron (Recommended)

Create/update `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-sari-courses",
      "schedule": "0 * * * *"
    }
  ]
}
```

This runs **every hour**.

Deploy:
```bash
vercel deploy --prod
```

### Option 2: External Service (EasyCron, cron-job.org)

1. Create account at https://www.easycron.com/
2. Add new cron job
3. URL: `https://your-domain.com/api/cron/sync-sari-courses`
4. Schedule: `0 * * * *` (every hour)
5. Method: POST

### Option 3: Local Testing

```bash
curl -X POST http://localhost:3000/api/cron/sync-sari-courses
```

---

## Architecture Updated

### Data Flow (with Cron)

```
Cron Service (every 6 hours)
    ↓
POST /api/cron/sync-sari-courses
    ↓
Fetch all tenants (sari_enabled = true)
    ↓
For each tenant:
    ├─ Create SARIClient (with tenant credentials)
    ├─ Create SARISyncEngine
    ├─ syncAllCourses('VKU')
    ├─ syncAllCourses('PGS')
    ├─ Update sari_last_sync_at
    └─ Log operation
    ↓
Return summary:
    ├─ tenants_processed
    ├─ total_syncs
    └─ failed_tenants[]
```

### No Manual Intervention Needed

**Before** (manual):
- Admin clicks sync button
- Admin waits for result
- Admin checks logs

**After** (auto):
- Cron job runs every 6 hours
- All tenants sync automatically
- Logs recorded in `sari_sync_logs`
- Admin just checks results when needed

---

## Monitoring

### Check Last Sync for Each Tenant
```sql
SELECT name, sari_last_sync_at
FROM tenants
WHERE sari_enabled = true
ORDER BY sari_last_sync_at DESC;
```

### View Recent Syncs
```sql
SELECT 
  t.name,
  ssl.operation,
  ssl.status,
  ssl.result,
  ssl.created_at
FROM sari_sync_logs ssl
JOIN tenants t ON t.id = ssl.tenant_id
ORDER BY ssl.created_at DESC
LIMIT 50;
```

### Check Success Rate (Last 24h)
```sql
SELECT 
  t.name,
  COUNT(*) as total_syncs,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed
FROM sari_sync_logs ssl
JOIN tenants t ON t.id = ssl.tenant_id
WHERE ssl.created_at > NOW() - INTERVAL '24 hours'
GROUP BY t.id, t.name
ORDER BY total_syncs DESC;
```

---

## Updated Implementation Roadmap

### ✅ Phase 1: Foundation (COMPLETE)
- [x] SARIClient with OAuth2
- [x] SARISyncEngine
- [x] 4 API endpoints
- [x] Database schema
- [x] Frontend composable

### ✅ Phase 2: Auto-Sync (COMPLETE - NEW)
- [x] Cron job endpoint
- [x] Multi-tenant loop
- [x] Error handling
- [x] Monitoring queries

### 🔨 Phase 3: Credentials UI (Next)
- [ ] Add SARI section to Security Tab in `admin/profile`
- [ ] Test connection button
- [ ] Save credentials
- [ ] Show current config

### 📊 Phase 4: Manual Sync Page (Optional)
- [ ] Build `pages/admin/sari-sync.vue` (for manual triggers)
- [ ] Show sync history
- [ ] VKU/PGS sync buttons (if needed)
- [ ] Real-time progress

### 🚀 Phase 5: Testing & Deployment
- [ ] Test against SARI test environment
- [ ] Deploy cron job to production
- [ ] Monitor first syncs
- [ ] Document for customers

---

## Cron Schedule Options

| Schedule | Frequency |
|----------|-----------|
| `0 * * * *` | **Every hour** (recommended) |
| `0 */6 * * *` | Every 6 hours |
| `0 2 * * *` | Once daily (2 AM) |
| `*/30 * * * *` | Every 30 minutes |
| `0 0 * * *` | Daily at midnight |

---

## Security & Error Handling

✅ **Service Role Only**: No auth needed (internal endpoint)
✅ **Tenant Isolation**: Each tenant processed independently
✅ **Graceful Failures**: One failed tenant doesn't stop others
✅ **Detailed Logging**: All operations logged to `sari_sync_logs`
✅ **Audit Trail**: Complete history for compliance
✅ **Error Recovery**: Logs help identify and fix issues

---

## What's Next?

### Immediate: Setup Cron Job
1. Add to `vercel.json` or configure external service
2. Deploy
3. Wait 6 hours for first sync

### Short Term: Add Credentials UI
- Modify `pages/admin/profile.vue`
- Add SARI section to Security tab
- Let admins save credentials

### Later: Manual Sync UI (optional)
- Build sync history page
- Show manual trigger buttons (backup)
- Display real-time progress

---

## FAQ

### Q: How often should it sync?
**A**: Every 6 hours by default. Can be changed in cron schedule.

### Q: What if a tenant's sync fails?
**A**: Error is logged, but other tenants continue. Admin can see error in logs.

### Q: Do I still need the manual sync buttons?
**A**: No, not anymore! Cron job handles everything. Can add later if manual override needed.

### Q: How do I disable sync for a tenant?
**A**: Set `sari_enabled = false` in tenants table. Cron will skip it.

### Q: Where can I see sync results?
**A**: Check `sari_sync_logs` table or query `sari_last_sync_at` in tenants.

### Q: What if cron job fails?
**A**: Error is logged. Try again next cycle. Check logs for details.

---

## Files Summary

### New Files
1. ✅ `server/api/cron/sync-sari-courses.post.ts` - Cron job logic
2. ✅ `SARI_CRON_SETUP_GUIDE.md` - Setup instructions

### Total Phase 1+2 Deliverables
- **Phase 1**: 11 files (foundation)
- **Phase 2**: 2 files (cron job + docs)
- **Total**: 13 files + 4 documentation files

---

## Implementation Status

✅ SARI API Client - DONE
✅ SARI Sync Engine - DONE  
✅ Database Schema - DONE
✅ Manual API Endpoints - DONE
✅ Frontend Composable - DONE
✅ **Automatic Cron Job - DONE** ⭐ NEW

🔨 Security Tab UI - NEXT
📊 Manual Sync Page - OPTIONAL
🚀 Testing & Deployment - LATER

---

## What "Automatic Sync" Means

**Before**: Admin manually clicks sync button
**After**: System automatically syncs every 6 hours without any action

```
Old Flow:
Admin → Opens admin page → Clicks "Sync Now" → Waits → Sees results

New Flow:
Cron Job → Runs automatically every 6 hours → Syncs all tenants → Logs results
Admin → Checks logs when needed (optional)
```

**Result**: No more manual work! Courses always up-to-date. ✅

---

## Next Steps

1. ✅ **Deploy cron job** (add to vercel.json or external service)
2. 🔨 **Add credentials UI** to Security Tab
3. 📊 **Build manual sync page** (optional, for edge cases)
4. 🚀 **Test against production SARI**

Ready to proceed with Phase 3? 🚀

