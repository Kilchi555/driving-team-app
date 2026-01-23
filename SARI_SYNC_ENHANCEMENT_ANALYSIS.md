# SARI Synchronization - Data Import Analysis

**Analysis Date**: 2026-01-23

---

## Current State - Data Being Synced

### 1. From SARI to course_participants
```
SARI Participant → course_participants
├─ faberid           ✅ Synced
├─ firstname        ✅ Synced → first_name
├─ lastname         ✅ Synced → last_name
├─ birthdate        ✅ Synced
├─ address          ✅ Synced → street
├─ zip              ✅ Synced
├─ city             ✅ Synced
└─ confirmed        ✅ Used for status mapping
```

### 2. From SARI to course_registrations (on sync)
```
SARI Participant → course_registrations
├─ participant_id   ✅ Linked
├─ course_id        ✅ Linked
├─ tenant_id        ✅ Set
├─ status           ✅ Mapped (confirmed/pending)
├─ sari_synced      ✅ Set to true
├─ sari_synced_at   ✅ Set to now()
└─ created_at       ✅ Set to now()
```

---

## Missing Data - What We DON'T Sync Yet

Looking at your data sample, here are empty fields that COULD be populated:

```json
{
  // ❌ MISSING - Can pull from SARI
  "first_name": null,          // SARI has firstname
  "last_name": null,           // SARI has lastname
  "email": null,               // SARI has email/contact_email
  "phone": null,               // SARI has phone/mobile
  
  // ❌ MISSING - Already available
  "sari_faberid": null,        // SARI has faberid - SHOULD sync!
  "street": null,              // SARI has address - SHOULD sync!
  "zip": null,                 // SARI has zip - SHOULD sync!
  "city": null,                // SARI has city - SHOULD sync!
  
  // ❌ MISSING - Additional metadata
  "sari_data": null,           // Could store full SARI response
  "sari_licenses": null,       // Could sync license/qualification data
  "registered_by": null,       // Could track admin who registered
  "notes": null,               // Could add enrollment notes
  
  // ✅ EMPTY BUT OK (set on payment)
  "amount_paid_rappen": 0,     // Set when payment completes
  "discount_applied_rappen": 0, // Set in payment processing
  "payment_id": null,          // Set by webhook
  "payment_method": null,      // Set by payment flow
}
```

---

## Enhancement Opportunities

### TIER 1: HIGH IMPACT - Should Implement

#### 1. Sync SARI Personal Data to course_registrations
**What**: Copy personal info from SARI directly to enrollment

**Why**: 
- Eliminates manual data entry
- Guarantees data accuracy from authoritative source
- Guest users get auto-populated data

**Changes Needed**:
```typescript
// In sari-sync-engine.ts syncCourseParticipants()
await this.supabase
  .from('course_registrations')
  .insert({
    // Current fields
    course_id: simyCourseId,
    participant_id: participantId,
    tenant_id: this.tenantId,
    status: participant.confirmed ? 'confirmed' : 'pending',
    sari_synced: true,
    
    // ADD THESE:
    first_name: participant.firstname || 'Unbekannt',
    last_name: participant.lastname || 'Unbekannt',
    email: participant.email || fullCustomerData?.email,
    phone: participant.phone || fullCustomerData?.phone,
    sari_faberid: participant.faberid,
    street: fullCustomerData?.address,
    zip: fullCustomerData?.zip,
    city: fullCustomerData?.city
  })
```

**Impact**: 
- Fills all personal data fields automatically
- No more NULL values for name, email, phone
- Matches course_participants data

#### 2. Store Full SARI Customer Data
**What**: Store raw SARI response in sari_data JSON column for audit trail

**Why**:
- Complete record of what SARI sent
- Useful for debugging sync issues
- Can compute license status changes

**Changes**:
```typescript
// Store full customer object
const fullSariData = await this.sari.getCustomer(faberid, birthdate)

await this.supabase
  .from('course_registrations')
  .insert({
    // ... other fields
    sari_data: {
      faberid: fullSariData.faberid,
      firstname: fullSariData.firstname,
      lastname: fullSariData.lastname,
      birthdate: fullSariData.birthdate,
      email: fullSariData.email,
      phone: fullSariData.phone,
      address: fullSariData.address,
      zip: fullSariData.zip,
      city: fullSariData.city,
      licenses: fullSariData.licenses || [],
      syncedAt: new Date().toISOString()
    }
  })
```

**Impact**:
- 100% audit trail of SARI data
- Can detect if SARI data changed
- Useful for debugging

#### 3. Sync License/Qualification Data
**What**: Import sari_licenses from SARI customer object

**Why**:
- Track which licenses person has (B, C, D, BE, CE, etc.)
- Validate course eligibility based on licenses
- Prevent unqualified enrollments

**Changes**:
```typescript
// Extract licenses from SARI
const licenses = fullCustomerData?.licenses || []
const licenseData = {
  valid_licenses: licenses.map(l => ({
    license_type: l.type,      // 'B', 'C', 'D', etc.
    issued_date: l.date_issued,
    issued_by: l.country,
    is_valid: l.valid
  })),
  sync_source: 'SARI',
  synced_at: new Date().toISOString()
}

await this.supabase
  .from('course_registrations')
  .insert({
    // ... other fields
    sari_licenses: licenseData
  })
```

**Impact**:
- Can validate prerequisites server-side
- Track eligibility changes over time
- Better audit trail

---

### TIER 2: MEDIUM IMPACT - Nice to Have

#### 4. Track Registration Source
**What**: Add `registered_by` field for admin registrations

**Why**:
- Audit trail of who created enrollment
- Distinguish SARI-synced vs. manual registrations

**Changes**:
```typescript
// When syncing from SARI
registered_by: 'system',  // or 'sari-sync'
registration_method: 'sari_sync',

// When manually created
registered_by: adminUserId,
registration_method: 'manual_enrollment'
```

#### 5. Add Enrollment Notes
**What**: Allow tracking of sync status and notes

**Why**:
- Comments on why enrollment might be different
- Track data quality issues

**Example**:
```typescript
notes: 'Auto-imported from SARI on 2026-01-23. Age calculated: 35 years old.'
```

#### 6. Import Birth Certificate / Document Info (if available in SARI)
**What**: If SARI has document verification data, store it

**Why**:
- Some courses require birthdate verification
- Complete personal record

---

### TIER 3: LOW IMPACT - Research Needed

#### 7. Sync Course Attendance/Completion Status
**What**: If SARI tracks attendance, sync back to our system

**Questions**:
- Does SARI return completion status?
- Does SARI track attendance records?
- Is this real-time or batch?

#### 8. Sync Fee/Payment Status from SARI
**What**: If SARI tracks payments, reconcile with our Wallee payments

**Questions**:
- Does SARI have payment tracking?
- Should we treat SARI payments as authoritative?
- How do we reconcile conflicts?

---

## Implementation Plan

### Phase 1 (ASAP - 2 hours)
1. Sync SARI personal data to course_registrations
2. Add sari_faberid field sync
3. Test with existing enrollments

### Phase 2 (This week - 4 hours)
4. Store full sari_data JSON for audit trail
5. Extract and sync sari_licenses
6. Add license validation on enrollment

### Phase 3 (Next week - 3 hours)
7. Add registered_by tracking
8. Add notes field for sync metadata
9. Create migration for historical data

---

## Code Changes Required

### File: server/utils/sari-sync-engine.ts

**Location**: Line ~456 (in syncCourseParticipants method)

```typescript
// CURRENT CODE (truncated)
const { error: regError } = await this.supabase
  .from('course_registrations')
  .insert({
    course_id: simyCourseId,
    participant_id: participantId,
    tenant_id: this.tenantId,
    status: participant.confirmed ? 'confirmed' : 'pending',
    sari_synced: true,
    sari_synced_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  })

// IMPROVED CODE
const registrationData: any = {
  // Existing fields
  course_id: simyCourseId,
  participant_id: participantId,
  tenant_id: this.tenantId,
  status: participant.confirmed ? 'confirmed' : 'pending',
  sari_synced: true,
  sari_synced_at: new Date().toISOString(),
  created_at: new Date().toISOString(),

  // TIER 1: Personal Data
  first_name: fullCustomerData?.firstname || participant.firstname || 'Unbekannt',
  last_name: fullCustomerData?.lastname || participant.lastname || 'Unbekannt',
  email: participant.email || fullCustomerData?.email || null,
  phone: participant.phone || fullCustomerData?.phone || null,
  sari_faberid: participant.faberid,
  street: fullCustomerData?.address || null,
  zip: fullCustomerData?.zip || null,
  city: fullCustomerData?.city || null,

  // TIER 1: Metadata
  sari_data: {
    faberid: participant.faberid,
    firstname: fullCustomerData?.firstname,
    lastname: fullCustomerData?.lastname,
    birthdate: fullCustomerData?.birthdate,
    email: fullCustomerData?.email,
    phone: fullCustomerData?.phone,
    address: fullCustomerData?.address,
    zip: fullCustomerData?.zip,
    city: fullCustomerData?.city,
    syncedAt: new Date().toISOString()
  },

  // TIER 1: Licenses
  sari_licenses: fullCustomerData?.licenses ? {
    licenses: fullCustomerData.licenses.map((l: any) => ({
      type: l.type || 'UNKNOWN',
      issued: l.date_issued,
      valid: l.valid !== false
    })),
    synced_at: new Date().toISOString()
  } : null,

  // TIER 2: Audit Trail
  registered_by: 'sari-sync',
  notes: `Auto-imported from SARI on ${new Date().toLocaleDateString('de-CH')}`
}

const { error: regError } = await this.supabase
  .from('course_registrations')
  .insert(registrationData)
```

---

## Migration for Historical Data

After implementing Phase 1, run this to backfill existing registrations:

```sql
UPDATE course_registrations cr
SET 
  first_name = cp.first_name,
  last_name = cp.last_name,
  street = cp.street,
  zip = cp.zip,
  city = cp.city,
  sari_faberid = cp.faberid,
  updated_at = NOW()
FROM course_participants cp
WHERE cr.participant_id = cp.id
  AND cr.tenant_id = cp.tenant_id
  AND (cr.first_name IS NULL OR cr.last_name IS NULL);
```

---

## Benefits Summary

| Feature | Current | After Improvement |
|---------|---------|-------------------|
| Personal data from SARI | ❌ No | ✅ Yes |
| Email/Phone on enrollment | ❌ No | ✅ Yes |
| SARI ID stored | ❌ No | ✅ Yes |
| Full audit trail | ❌ No | ✅ Yes (JSON) |
| License tracking | ❌ No | ✅ Yes |
| Registration source tracked | ❌ No | ✅ Yes |
| Data completeness | ~40% | ~95% |

---

## Recommendation

✅ **Implement Tier 1 immediately** - 2 hours of work, massive data quality improvement
- Guest users will have complete personal info
- No more NULL names/emails
- Full SARI audit trail
- License tracking for future validation

Do you want me to implement these changes?

