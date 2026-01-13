# SARI Integration - Phase 1 Implementation Checklist

## ✅ Completed

### Foundation Files Created

- [x] **`utils/sariClient.ts`** - SARI API Client
  - OAuth2 authentication with token caching
  - 6 API methods: getVersion, getCustomer, getCourses, getCourseDetail, enrollStudent, unenrollStudent
  - Proper error handling
  - TypeScript interfaces for all responses

- [x] **`server/utils/sari-sync-engine.ts`** - Sync Logic
  - SARISyncEngine class with sync operations
  - Course mapping and storage
  - Customer mapping functionality
  - Sync logging for audit trail
  - Status queries

- [x] **`sql_migrations/20250218_add_sari_integration.sql`** - Database Schema
  - New tables: sari_sync_logs, sari_customer_mapping, sari_course_mapping
  - New columns on tenants, courses, users, course_categories
  - RLS policies for new tables
  - Indexes for performance
  - View: sari_sync_status

### API Endpoints Created

- [x] **`POST /api/sari/test-connection`** - Test SARI credentials
  - Validates connection with getVersion()
  - Returns success/error

- [x] **`POST /api/sari/sync-courses`** - Trigger course sync
  - Requires authentication (admin/staff)
  - Gets SARI config from tenant
  - Calls SARISyncEngine
  - Updates tenant sync timestamp

- [x] **`GET /api/sari/sync-status`** - Get sync status and history
  - Returns latest sync
  - Returns last 10 sync operations
  - Returns tenant SARI config

- [x] **`POST /api/sari/save-settings`** - Save SARI credentials
  - Requires admin role
  - Updates tenant SARI config
  - Supports enabling/disabling SARI

### Frontend Composable

- [x] **`composables/useSARISync.ts`** - Frontend sync management
  - testConnection()
  - saveSettings()
  - syncCourses()
  - loadSyncStatus()
  - Sync progress and status tracking
  - Error handling

---

## 📋 Next Steps (Phase 2)

### Admin UI Component
- [ ] Create `pages/admin/sari-settings.vue`
  - [ ] Settings form (enable/disable, environment, credentials)
  - [ ] Test connection button
  - [ ] Save button with confirmation
  - [ ] Current configuration display

- [ ] Create `pages/admin/sari-sync.vue`
  - [ ] Sync history table (last 10 operations)
  - [ ] VKU Sync button
  - [ ] PGS Sync button
  - [ ] Real-time progress indicator
  - [ ] Error messages display
  - [ ] Last sync timestamp

### Cron Job (Optional)
- [ ] Create `server/api/cron/sync-sari-courses.post.ts`
  - [ ] Runs every 6 hours (configurable)
  - [ ] For each tenant with SARI enabled
  - [ ] Syncs both VKU and PGS
  - [ ] Proper error handling and logging

---

## 🧪 Testing Checklist

### Unit Tests
- [ ] Test SARIClient authentication
- [ ] Test SARIClient getVersion
- [ ] Test SARISyncEngine course mapping
- [ ] Test SARISyncEngine customer mapping

### Integration Tests
- [ ] Test against SARI test environment
- [ ] Test credential validation
- [ ] Test sync operation logging
- [ ] Test RLS policies

### Manual Testing
- [ ] [ ] Test connection with invalid credentials
- [ ] [ ] Test connection with valid credentials
- [ ] [ ] Test course sync (VKU)
- [ ] [ ] Test course sync (PGS)
- [ ] [ ] Test sync status retrieval
- [ ] [ ] Test error scenarios (network, invalid data)

---

## 🔧 Configuration Required

### Before Using SARI Integration

1. **Get Kyberna Test Credentials**
   - client_id
   - client_secret
   - username
   - password

2. **Set in Admin UI** (once UI is built)
   - Environment (test/production)
   - Client ID
   - Client Secret
   - Username
   - Password

3. **Verify Course Categories**
   - Add `sari_category_code` values (A1, A, B, C, etc.)
   - Set `sari_course_type` (VKU or PGS)
   - Set `requires_sari_sync = true`

4. **Enable SARI for Tenant**
   - `sari_enabled = true`
   - Select environment (test or production)

---

## 📊 Data Flow

### Course Sync Flow

```
SARI API
    ↓ getCourses(VKU/PGS)
SARIClient
    ↓ Parses response
SARISyncEngine
    ├─ mapAndStoreCourse()
    └─ Creates/Updates courses table
    ↓
sari_sync_logs
    ↓ (Logged)
Admin Dashboard
    └─ Shows sync status
```

### Student Mapping Flow

```
SARI getCustomer(faberid, birthdate)
    ↓
SARISyncEngine.findOrCreateUserByFABERID()
    ├─ Check sari_customer_mapping
    ├─ Create user if needed
    └─ Create mapping entry
    ↓
users table + sari_customer_mapping table
```

---

## 🚨 Known Limitations & Future Work

### Current Phase 1 Limitations
1. No automatic sync (manual trigger only, cron job is optional)
2. No automatic enrollment posting back to SARI
3. No conflict detection/resolution
4. No partial student data (just creates placeholder)
5. No webhook support (must poll)

### Future Enhancements (Phase 3+)
- [ ] Bidirectional sync (post enrollments to SARI)
- [ ] Automatic periodic sync via cron
- [ ] Conflict detection and resolution UI
- [ ] Student details enrichment (fetch full data from SARI)
- [ ] Webhook support when Kyberna releases it
- [ ] Import history and rollback capability
- [ ] Batch operations (bulk enroll/unenroll)

---

## 📚 Database Schema Summary

### New Tables

**sari_sync_logs**
- Tracks all sync operations
- Records success/error status
- Stores metadata and error messages
- Indexed by tenant_id, created_at, operation

**sari_customer_mapping**
- Maps SARI FABERID to Simy user_id
- One-to-one relationship
- Tracks last sync time
- Unique constraint: tenant_id + sari_faberid

**sari_course_mapping**
- Maps SARI course ID to Simy course_id
- Tracks course type (VKU/PGS)
- Unique constraint: tenant_id + sari_course_id

### Modified Tables

**tenants**
- sari_enabled (boolean)
- sari_environment (test/production)
- sari_client_id, sari_client_secret
- sari_username, sari_password
- sari_last_sync_at (timestamp)

**courses**
- sari_course_id (integer)
- sari_last_sync_at (timestamp)

**users**
- sari_faberid (string)
- sari_birthdate (date)

**course_categories**
- sari_category_code (string, e.g., "A1", "B")
- sari_course_type (VKU/PGS)

---

## 🔐 Security Notes

1. SARI credentials are stored in `tenants` table
   - Only admins can update
   - RLS policies prevent unauthorized access
   - Consider encryption at rest for production

2. Access Control
   - Only admins can configure SARI
   - Only staff/admins can trigger sync
   - Sync logs are audit trail

3. Rate Limiting
   - SARI has "fair-usage policy"
   - Consider implementing backoff on errors
   - Currently no rate limiting on our side (add if needed)

---

## 📞 Support

### If Errors Occur

1. Check `sari_sync_logs` for detailed error messages
2. Review SARI API documentation in `SARI_API_DOCUMENTATION.md`
3. Verify credentials in admin settings
4. Test connection before syncing
5. Check tenant RLS policies are correct

### Questions for Kyberna

- [ ] Course ID stability across syncs
- [ ] Rate limit details (requests per minute/hour)
- [ ] Pagination for large course lists
- [ ] Webhook availability timeline
- [ ] Data modification policies (read-only vs. writable fields)

---

## 🎯 Success Criteria

Phase 1 is complete when:

✅ SARIClient can authenticate and call all 6 API methods
✅ SARISyncEngine successfully syncs courses to database
✅ Sync operations are properly logged
✅ RLS policies prevent unauthorized access
✅ All API endpoints return correct responses
✅ Error handling works for all failure scenarios
✅ Frontend composable manages sync state correctly

Phase 2 (Admin UI) can then begin with high confidence.

