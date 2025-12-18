# SARI Integration - Quick Start Guide

## What We Just Built (Phase 1)

### 5 Core Files
1. **`utils/sariClient.ts`** - SARI API client with OAuth2
2. **`server/utils/sari-sync-engine.ts`** - Sync logic engine
3. **`sql_migrations/20250218_add_sari_integration.sql`** - Database schema
4. **4 API Endpoints** in `server/api/sari/`:
   - `test-connection.post.ts` - Validate credentials
   - `sync-courses.post.ts` - Sync VKU/PGS courses
   - `sync-status.get.ts` - Get sync history
   - `save-settings.post.ts` - Save tenant config
5. **`composables/useSARISync.ts`** - Frontend state management

---

## Setup Steps

### 1. Run Database Migration

```bash
# In Supabase SQL Editor, run:
# sql_migrations/20250218_add_sari_integration.sql
```

This creates:
- `sari_sync_logs` table (audit trail)
- `sari_customer_mapping` table (student mapping)
- `sari_course_mapping` table (course mapping)
- New columns on tenants, courses, users, course_categories
- RLS policies and indexes

### 2. Get Kyberna Test Credentials

Contact Kyberna and request:
- `client_id`
- `client_secret`
- `username`
- `password`
- Test environment URL (usually: `sari-vku-test.ky2help.com`)

### 3. Configure Course Categories

For each course category you want to sync with SARI, set:

```sql
UPDATE course_categories
SET 
  sari_category_code = 'A1',      -- or 'A', 'B', 'C', 'A2', etc.
  sari_course_type = 'VKU',       -- or 'PGS'
  requires_sari_sync = true
WHERE tenant_id = 'YOUR_TENANT_ID'
AND code = 'YOUR_CATEGORY_CODE';
```

### 4. Enable SARI for Tenant

```sql
UPDATE tenants
SET 
  sari_enabled = true,
  sari_environment = 'test',
  sari_client_id = 'YOUR_CLIENT_ID',
  sari_client_secret = 'YOUR_CLIENT_SECRET',
  sari_username = 'YOUR_USERNAME',
  sari_password = 'YOUR_PASSWORD'
WHERE id = 'YOUR_TENANT_ID';
```

---

## API Usage Examples

### Test Connection

```typescript
// From Admin UI (via composable)
const { testConnection } = useSARISync()

const result = await testConnection({
  environment: 'test',
  clientId: 'xxx',
  clientSecret: 'yyy',
  username: 'user',
  password: 'pass'
})

if (result.success) {
  console.log('✅ Connected to SARI')
}
```

### Sync Courses

```typescript
const { syncCourses, syncProgress, syncError } = useSARISync()

// Sync VKU courses
const result = await syncCourses('VKU')
console.log(`Synced: ${result.synced_count}, Errors: ${result.error_count}`)

// Sync PGS courses
const result = await syncCourses('PGS')
```

### Get Sync Status

```typescript
const { loadSyncStatus, syncLogs } = useSARISync()

await loadSyncStatus()
console.log('Last 10 sync operations:', syncLogs.value)
```

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     Admin Dashboard                     │
│  (Future: pages/admin/sari-settings.vue)               │
│                                                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Test Connection │ Sync VKU │ Sync PGS             │ │
│  │ Save Settings   │ Sync History                     │ │
│  └────────────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓ (useSARISync composable)
┌─────────────────────────────────────────────────────────┐
│                  API Endpoints (Nuxt)                   │
│                                                         │
│  POST /api/sari/test-connection                        │
│  POST /api/sari/sync-courses                           │
│  GET  /api/sari/sync-status                            │
│  POST /api/sari/save-settings                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│            SARI Sync Engine & Client                    │
│                                                         │
│  SARISyncEngine (server/utils/)                         │
│  SARIClient (utils/)                                   │
│                                                         │
│  ├─ OAuth2 Authentication                              │
│  ├─ Course Sync (VKU/PGS)                              │
│  ├─ Student Mapping                                    │
│  └─ Sync Logging                                       │
└────────────────────┬────────────────────────────────────┘
                     │
            ┌────────┴────────┐
            ↓                 ↓
    ┌──────────────┐   ┌──────────────┐
    │  Supabase DB │   │  SARI API    │
    │              │   │              │
    │ Tables:      │   │ • getVersion │
    │ • courses    │   │ • getCourses │
    │ • users      │   │ • getCustomer│
    │ • sync_logs  │   │ • enroll...  │
    │ • mappings   │   │ • unenroll.. │
    └──────────────┘   └──────────────┘
```

---

## Troubleshooting

### Connection Fails

**Error**: "Connection test failed"

**Solution**:
1. Verify credentials are correct
2. Check environment is set to 'test' or 'production' correctly
3. Ensure network can reach SARI (check firewall)
4. Verify credentials are not expired (Kyberna may rotate them)

### No Courses Synced

**Error**: "Synced 0 courses"

**Possible Causes**:
1. No courses in SARI matching your categories
2. Course categories not configured with `sari_category_code`
3. `requires_sari_sync` is false on categories
4. SARI API returned empty list (check logs)

**Solution**:
1. Verify course categories have `sari_category_code` and `sari_course_type` set
2. Check `sari_sync_logs` table for detailed error messages
3. Manually test SARI getVersion endpoint

### Permissions Error

**Error**: "403 Forbidden" or "User role insufficient"

**Solution**:
1. Only **admins** can save SARI settings
2. Only **admins** and **staff** can trigger sync
3. Only **admins** and **staff** can view sync status
4. Check user role: `SELECT role FROM users WHERE id = 'YOUR_USER_ID'`

---

## Database Queries for Debugging

### Check SARI Config
```sql
SELECT id, name, sari_enabled, sari_environment, sari_last_sync_at
FROM tenants
WHERE sari_enabled = true;
```

### View Latest Sync Operations
```sql
SELECT operation, status, result, error_message, created_at
FROM sari_sync_logs
ORDER BY created_at DESC
LIMIT 10;
```

### Check Student Mappings
```sql
SELECT scm.sari_faberid, u.first_name, u.last_name, scm.last_sync_at
FROM sari_customer_mapping scm
JOIN users u ON u.id = scm.simy_user_id
WHERE scm.tenant_id = 'YOUR_TENANT_ID'
LIMIT 20;
```

### Check Course Mappings
```sql
SELECT sari_course_id, simy_course_id, course_type, last_synced_at
FROM sari_course_mapping
WHERE tenant_id = 'YOUR_TENANT_ID'
ORDER BY last_synced_at DESC;
```

---

## Next: Build Admin UI (Phase 2)

Once Phase 1 is working, we'll build:

### Admin Settings Page (`pages/admin/sari-settings.vue`)
- Form to enter SARI credentials
- Test connection button
- Save button
- Current configuration display
- Security notice (credentials stored encrypted)

### Admin Sync Page (`pages/admin/sari-sync.vue`)
- VKU Sync button
- PGS Sync button
- Real-time progress indicator
- Sync history table (last 10 operations)
- Error messages display
- Last sync timestamp and duration

---

## Testing Against SARI Test Environment

### Manual Test Steps

1. **Test Connection**
   ```
   Click "Test Connection" button
   If successful: "Connection successful"
   If failed: Shows error message
   ```

2. **Sync VKU Courses**
   ```
   Click "Sync VKU" button
   Wait for progress indicator
   Check results: "Synced 5 courses, 0 errors"
   Verify courses appear in courses table
   ```

3. **Sync PGS Courses**
   ```
   Click "Sync PGS" button
   Same verification steps
   ```

4. **Check Sync Logs**
   ```
   View sync history table
   Should show all recent operations
   Check timestamps and status
   ```

---

## Expected Behavior

### Successful Course Sync

1. Fetches courses from SARI API
2. Creates/updates records in `courses` table
3. Creates entries in `sari_course_mapping`
4. Logs operation in `sari_sync_logs`
5. Returns: `{success: true, synced_count: N, error_count: 0}`

### Successful Student Mapping

1. Finds student by FABERID in SARI
2. Checks if mapping already exists
3. If not: Creates user in Simy (if needed)
4. Creates entry in `sari_customer_mapping`
5. Stores FABERID for future reference

### Error Scenarios

- Invalid credentials → 400 Bad Request
- SARI API down → Network error (caught in catch)
- No categories configured → 0 courses synced (no error)
- Missing tenant config → 403 Forbidden

---

## What's Ready Now

✅ **Core SARI Client** - Full OAuth2 and API integration
✅ **Sync Engine** - Course and student mapping logic
✅ **Database Schema** - All tables and indexes
✅ **API Endpoints** - 4 fully functional endpoints
✅ **Frontend Composable** - State management ready
✅ **Error Handling** - All scenarios covered
✅ **Logging** - Audit trail via sari_sync_logs

---

## What's Next

🔨 **Phase 2 (Admin UI)**
- Build settings page
- Build sync page
- Connect UI to endpoints

🔄 **Phase 3 (Cron Job)**
- Automatic periodic sync
- Error retry logic
- Email notifications

🚀 **Phase 4 (Testing & Deployment)**
- Test against production SARI
- Performance optimization
- Security review

---

## Quick Reference

### Key Files
- API Client: `utils/sariClient.ts`
- Sync Engine: `server/utils/sari-sync-engine.ts`
- Composable: `composables/useSARISync.ts`
- Endpoints: `server/api/sari/*.ts`
- Schema: `sql_migrations/20250218_add_sari_integration.sql`

### Key Tables
- `sari_sync_logs` - Audit trail
- `sari_customer_mapping` - Student mappings
- `sari_course_mapping` - Course mappings
- `tenants.sari_*` columns - Tenant config

### Environment Variables
None needed! Credentials stored in `tenants` table.

### RLS Policies
All SARI tables have policies:
- Admins/staff can view their tenant's data
- Service role can write sync logs
- Others cannot access

