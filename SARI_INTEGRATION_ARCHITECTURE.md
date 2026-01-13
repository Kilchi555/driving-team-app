# SARI API Integration Architecture

## Overview

**Goal**: Integrate Simy driving school app with SARI API (Course Registration System) to synchronize VKU/PGS courses and student enrollments.

**Existing Foundation**: The codebase already has robust course management, payment processing (Wallee), enrollment flows, and a well-structured composable/API pattern.

---

## Current Architecture - What We Have

### 1. **Course Management Layer** (Frontend)

```
composables/
├── useCourseCategories.ts       ← Loads course categories per tenant
│   ├── activeCategories
│   ├── sariCategories          ← Already filters for SARI sync needed!
│   ├── privatCategories        ← Non-SARI courses
│   └── loadCategories()        ← Supabase query
│
├── useCourseParticipants.ts     ← Manages enrollments & waitlist
│   ├── registrations[]
│   ├── waitlist[]
│   ├── loadRegistrations()
│   ├── registerParticipant()
│   └── cancelRegistration()
│
└── (No SARI-specific composable yet)
```

**Key DB Field**: `course_categories.requires_sari_sync` ✅
- Already set up to identify which categories need SARI sync

### 2. **API Enrollment Flow** (Backend)

```
server/api/courses/enroll/post.ts
├── Check tenant_id from auth user
├── Create user if doesn't exist
├── Check if already enrolled
├── Create course_registrations record
└── Return enrollment
```

**Pattern**: Supabase client → Insert/Query → Return response

### 3. **Wallee Integration** (Proven Pattern)

```
utils/walleeService.ts
├── WalleeService class
├── createTransaction()
└── testConnection()

server/utils/wallee-config.ts
├── getWalleeConfigForTenant()    ← Multi-tenant config!
├── getWalleeSDKConfig()
└── Per-tenant Wallee Space IDs stored in DB
```

**Key Learning**: Multi-tenant service config pattern already exists!

### 4. **Admin UI Pattern**

```
server/api/admin/
├── sync-all-wallee-payments.post.ts     ← Bulk sync endpoint
├── sync-wallee-payment.post.ts          ← Single sync endpoint
└── (No SARI sync endpoints yet)
```

### 5. **Database Schema - What Exists**

```sql
-- Course Management
course_categories
├── id, tenant_id, code, name
├── sari_category_code          ← SARI mapping!
├── requires_sari_sync          ← Control flag
├── default_price_rappen
└── ...

courses (likely exists)
├── id, tenant_id, category_id
├── name, date, max_participants
└── ...

course_registrations
├── id, course_id, tenant_id
├── user_id, status, registration_date
└── ...

-- What we need:
sari_sync_logs (new)
├── id, tenant_id, timestamp
├── operation (FETCH_COURSES, ENROLL, etc)
├── status, result, error_message
└── metadata

sari_customer_mapping (new)
├── id, tenant_id, sari_faberid
├── simy_user_id
└── sync_status, last_sync_at
```

---

## SARI API - What They Provide

### Endpoints (6 Total)
1. **getVersion** - Health check
2. **getCustomer** - Get by FABERID + birthdate
3. **getCourses** - Get all upcoming courses
4. **getCourseDetail** - Get course participants
5. **putPersonCourse** - Enroll student
6. **deletePersonCourse** - Remove enrollment

### Authentication
- OAuth2 flow
- Get `access_token` with credentials
- Token valid for 3600 seconds
- Request format: `Authorization: Bearer {token}`

### Key Challenges
- No webhooks (must poll)
- Course IDs are numeric but may not be stable
- Need to map SARI courses to Simy courses
- FABERID is the unique student identifier

---

## Proposed Architecture - SARI Integration

### Layer 1: SARI API Client Service

**File**: `utils/sariClient.ts`

```typescript
export class SARIClient {
  private config: {
    baseUrl: 'https://sari-vku-test.ky2help.com' | 'https://www.vku-pgs.asa.ch'
    clientId: string
    clientSecret: string
    username: string
    password: string
  }
  private accessToken?: string
  private tokenExpiry?: Date

  async authenticate(): Promise<string>
  async getVersion(text: string): Promise<string>
  async getCustomer(faberid: string, birthdate: string): Promise<Customer>
  async getCourses(courseType: 'VKU' | 'PGS'): Promise<CourseGroup>
  async getCourseDetail(id: number): Promise<CourseMember[]>
  async enrollStudent(courseId: number, faberid: string, birthdate: string): Promise<void>
  async unenrollStudent(courseId: number, faberid: string): Promise<void>
}
```

**Why here**: Reusable across server/composables, type-safe interface, testable

### Layer 2: SARI Sync Engine

**File**: `server/utils/sari-sync-engine.ts`

```typescript
export class SARISyncEngine {
  constructor(private supabase: SupabaseClient, private sari: SARIClient) {}

  // Core operations
  async syncAllCourses(tenantId: string, courseType: 'VKU' | 'PGS'): Promise<SyncResult>
  async mapSARICourseToCourse(tenantId: string, sariCourse: any): Promise<Course | null>
  async syncStudentEnrollments(tenantId: string, faberid: string): Promise<void>
  
  // Data mapping
  async findOrCreateUserByFABERID(tenantId: string, faberid: string): Promise<User>
  
  // Conflict resolution
  async reconcileEnrollmentConflicts(tenantId: string): Promise<ConflictReport>
}
```

**Why here**: Encapsulates complex sync logic, handles Supabase + SARI interaction

### Layer 3: Server Endpoints

**File**: `server/api/sari/sync-courses.post.ts`

```typescript
// POST /api/sari/sync-courses
// Admin endpoint to trigger course sync
export default defineEventHandler(async (event) => {
  // 1. Verify admin auth
  // 2. Get tenant_id from user
  // 3. Get SARI credentials from tenant config
  // 4. Call SARISyncEngine.syncAllCourses()
  // 5. Return {success, courses_synced, errors}
})
```

Other endpoints:
- `POST /api/sari/sync-enrollments` - Sync specific student
- `POST /api/sari/test-connection` - Test credentials
- `GET /api/sari/sync-status` - Last sync status
- `GET /api/sari/sync-logs` - History

### Layer 4: Cron Job

**File**: `server/api/cron/sync-sari-courses.post.ts`

```typescript
// Runs every 6 hours (configurable)
// For each tenant with SARI enabled:
//   1. Fetch new/updated courses
//   2. Detect enrollment changes
//   3. Log results
```

### Layer 5: Composables (Frontend)

**File**: `composables/useSARISync.ts`

```typescript
export const useSARISync = () => {
  const syncStatus = ref<'idle' | 'syncing' | 'error'>('idle')
  const lastSyncAt = ref<Date | null>(null)
  const syncError = ref<string | null>(null)

  const triggerSync = async () => {
    // Call POST /api/sari/sync-courses
  }

  const getSyncLogs = async () => {
    // Fetch sari_sync_logs
  }

  return {
    syncStatus,
    lastSyncAt,
    syncError,
    triggerSync,
    getSyncLogs
  }
}
```

---

## Integration Points

### 1. **Course Creation Flow**

```
SARI API (External)
    ↓ (sync)
sari_sync_logs (track)
    ↓ (parse)
SARISyncEngine
    ↓ (map)
courses table
    ↓ (populate UI)
Admin Dashboard / Frontend
```

### 2. **Student Enrollment Flow**

```
Option A: Manual Enrollment
  Staff clicks "Sync from SARI"
    ↓
  Admin fetches student from SARI (getCustomer)
    ↓
  Creates/updates Simy user
    ↓
  Creates course_registration
    ↓
  Optionally syncs back to SARI (putPersonCourse)

Option B: Auto-Sync on Change (future)
  Staff enrolls in Simy
    ↓
  Trigger automatically posts to SARI (putPersonCourse)
```

### 3. **Data Mapping**

```
SARI                    →  Simy
────────────────────────────────
faberid                 →  external_id (new field)
firstname + lastname    →  first_name + last_name
birthdate              →  birthdate
A1, B, C               →  course_categories.sari_category_code
Course ID (numeric)    →  courses.sari_course_id (new field)
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Create `utils/sariClient.ts` (OAuth + API calls)
- [ ] Create `server/utils/sari-sync-engine.ts` (sync logic)
- [ ] Create database tables: `sari_sync_logs`, `sari_customer_mapping`
- [ ] Add fields to existing tables: `courses.sari_course_id`, `users.sari_faberid`

### Phase 2: Admin UI (Week 2)
- [ ] Create `pages/admin/sari-settings.vue` (configure credentials)
- [ ] Create `pages/admin/sari-sync.vue` (trigger sync, view logs)
- [ ] Create endpoints: `sync-courses.post.ts`, `test-connection.post.ts`
- [ ] Add composable: `useSARISync.ts`

### Phase 3: Sync Engine (Week 3)
- [ ] Implement course sync logic
- [ ] Implement enrollment conflict detection
- [ ] Create cron job for periodic sync
- [ ] Add error handling & retry logic

### Phase 4: Testing & Refinement (Week 4)
- [ ] Test against SARI staging environment
- [ ] Document data mapping
- [ ] Create admin guide
- [ ] Performance optimization

---

## Example Implementation Skeleton

### `utils/sariClient.ts`

```typescript
interface SARIConfig {
  environment: 'test' | 'production'
  clientId: string
  clientSecret: string
  username: string
  password: string
}

export class SARIClient {
  private baseUrl: string
  private config: SARIConfig
  private accessToken?: string
  private tokenExpiry?: Date

  constructor(config: SARIConfig) {
    this.config = config
    this.baseUrl = config.environment === 'test' 
      ? 'https://sari-vku-test.ky2help.com'
      : 'https://www.vku-pgs.asa.ch'
  }

  async authenticate(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken
    }

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: 'password',
      username: this.config.username,
      password: this.config.password
    })

    const response = await fetch(`${this.baseUrl}/oauth/v2/token?${params}`, {
      method: 'GET'
    })

    const data = await response.json()
    this.accessToken = data.access_token
    this.tokenExpiry = new Date(Date.now() + data.expires_in * 1000)
    
    return this.accessToken
  }

  async getCourses(courseType: 'VKU' | 'PGS'): Promise<any> {
    const token = await this.authenticate()
    
    const response = await fetch(
      `${this.baseUrl}/api/courseregistration/courses/${courseType}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    )

    if (!response.ok) throw new Error(`SARI error: ${response.statusText}`)
    
    const data = await response.json()
    if (data.status !== 'OK') throw new Error(data.status)
    
    return data.result
  }

  // ... other methods
}
```

### `server/utils/sari-sync-engine.ts`

```typescript
export class SARISyncEngine {
  constructor(
    private supabase: SupabaseClient,
    private sari: SARIClient
  ) {}

  async syncAllCourses(tenantId: string, courseType: 'VKU' | 'PGS') {
    try {
      const courseGroup = await this.sari.getCourses(courseType)
      
      const results = []
      for (const course of courseGroup.courses) {
        // Map SARI course to Simy format
        const mapped = await this.mapSARICourseToCourse(tenantId, course)
        if (mapped) results.push(mapped)
      }

      // Log sync
      await this.supabase.from('sari_sync_logs').insert({
        tenant_id: tenantId,
        operation: 'FETCH_COURSES',
        status: 'success',
        result: { courses_synced: results.length },
        metadata: { course_type: courseType }
      })

      return results
    } catch (error) {
      // Log error
      await this.supabase.from('sari_sync_logs').insert({
        tenant_id: tenantId,
        operation: 'FETCH_COURSES',
        status: 'error',
        error_message: error.message,
        metadata: { course_type: courseType }
      })
      throw error
    }
  }
}
```

---

## Database Schema Changes

```sql
-- Add to course_categories
ALTER TABLE course_categories 
ADD COLUMN sari_category_code TEXT,
ADD COLUMN sari_course_type VARCHAR(10); -- 'VKU' or 'PGS'

-- Add to courses
ALTER TABLE courses
ADD COLUMN sari_course_id INTEGER,
ADD COLUMN sari_last_sync_at TIMESTAMP;

-- Add to users
ALTER TABLE users
ADD COLUMN sari_faberid VARCHAR(20),
ADD COLUMN sari_birthdate DATE;

-- New tables
CREATE TABLE sari_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  operation VARCHAR(50),
  status VARCHAR(20),
  result JSONB,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX(tenant_id, created_at)
);

CREATE TABLE sari_customer_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  sari_faberid VARCHAR(20),
  simy_user_id UUID REFERENCES users(id),
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, sari_faberid)
);

-- Tenant SARI credentials
ALTER TABLE tenants
ADD COLUMN sari_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN sari_environment VARCHAR(20) DEFAULT 'test',
ADD COLUMN sari_client_id TEXT,
ADD COLUMN sari_client_secret TEXT,
ADD COLUMN sari_username TEXT,
ADD COLUMN sari_password TEXT,
ADD COLUMN sari_last_sync_at TIMESTAMP;
```

---

## Security Considerations

1. **Credentials Storage**: Encrypt SARI credentials in `tenants` table
2. **RLS**: Only staff/admin of tenant can trigger sync
3. **Rate Limiting**: SARI has fair-usage policy → implement backoff
4. **Data Validation**: Validate FABERID format & birthdate
5. **Audit Trail**: Log all sync operations with results

---

## Next Steps

1. **Confirm table structure** with existing schema
2. **Choose Kyberna test environment** credentials
3. **Build SARI Client** (start with `getVersion()` as test)
4. **Create sync endpoints**
5. **Test against staging**

---

## Questions to Clarify with Kyberna

- Do course IDs remain stable across syncs?
- Any pagination requirements for large course lists?
- How often can we poll? (rate limits?)
- Can we store FABERID for future syncs?
- Any webhooks planned for future versions?

