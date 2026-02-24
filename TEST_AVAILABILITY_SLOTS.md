# Availability Slot Management - Test Plan

## Overview
This tests the new AvailabilitySlotManager that handles:
- Slot release when appointments are cancelled
- Slot invalidation when appointments are moved
- External busy time slot management
- Working hours deactivation slot management

## Manual Test Steps

### TEST 1: Appointment Creation → Slot Invalidation
**Steps:**
1. Go to staff dashboard
2. Create a new appointment for a staff member (e.g., Tuesday 10:00-12:00)
3. Check database: `SELECT * FROM availability_slots WHERE staff_id='{STAFF_ID}' AND DATE(start_time) = '2026-02-25' ORDER BY start_time`
4. Verify: All overlapping slots have `is_available = false`

**Expected:**
- Slots from 10:00-12:00 should have `is_available = false`
- Other slots remain `is_available = true`

---

### TEST 2: Appointment Edit (Move) → Release Old + Invalidate New
**Steps:**
1. Edit the appointment created in TEST 1
2. Move it to different time (e.g., 14:00-16:00)
3. Check database: `SELECT * FROM availability_slots WHERE staff_id='{STAFF_ID}' AND DATE(start_time) = '2026-02-25' ORDER BY start_time`

**Expected:**
- Old slots (10:00-12:00): `is_available = true` (released)
- New slots (14:00-16:00): `is_available = false` (invalidated)

---

### TEST 3: Appointment Cancellation → Release All Slots
**Steps:**
1. Delete/Cancel the appointment from TEST 2
2. Check database: `SELECT COUNT(*) as available_count FROM availability_slots WHERE staff_id='{STAFF_ID}' AND DATE(start_time) = '2026-02-25' AND is_available = true`

**Expected:**
- All slots for that staff/date should become `is_available = true`

---

### TEST 4: External Busy Time Creation → Invalidate Slots
**Steps:**
1. Call API (or UI if available):
   ```
   POST /api/staff/manage-external-busy-times
   {
     "action": "create",
     "staff_id": "{STAFF_ID}",
     "start_time": "2026-02-25T15:00:00Z",
     "end_time": "2026-02-25T16:00:00Z",
     "tenant_id": "{TENANT_ID}",
     "title": "Team Meeting",
     "source": "manual"
   }
   ```
2. Check database: `SELECT * FROM availability_slots WHERE staff_id='{STAFF_ID}' AND start_time BETWEEN '2026-02-25T15:00:00Z' AND '2026-02-25T16:00:00Z'`

**Expected:**
- Overlapping slots: `is_available = false`
- Entry created in `external_busy_times` table

---

### TEST 5: External Busy Time Update → Release Old + Invalidate New
**Steps:**
1. Call API:
   ```
   POST /api/staff/manage-external-busy-times
   {
     "action": "update",
     "id": "{BUSY_TIME_ID}",
     "staff_id": "{STAFF_ID}",
     "old_start_time": "2026-02-25T15:00:00Z",
     "old_end_time": "2026-02-25T16:00:00Z",
     "start_time": "2026-02-25T17:00:00Z",
     "end_time": "2026-02-25T18:00:00Z",
     "tenant_id": "{TENANT_ID}"
   }
   ```
2. Verify slots changed

**Expected:**
- 15:00-16:00 slots: `is_available = true`
- 17:00-18:00 slots: `is_available = false`

---

### TEST 6: External Busy Time Deletion → Release Slots
**Steps:**
1. Call API:
   ```
   POST /api/staff/manage-external-busy-times
   {
     "action": "delete",
     "id": "{BUSY_TIME_ID}",
     "staff_id": "{STAFF_ID}",
     "start_time": "2026-02-25T17:00:00Z",
     "end_time": "2026-02-25T18:00:00Z",
     "tenant_id": "{TENANT_ID}"
   }
   ```
2. Check: 17:00-18:00 slots should be released

**Expected:**
- Slots become `is_available = true`
- Entry deleted from `external_busy_times`

---

### TEST 7: Working Hours Deactivation → Release Daily Slots
**Steps:**
1. Go to Staff Settings → Working Hours
2. Deactivate Tuesday (toggle to off)
3. Check database: `SELECT COUNT(*) as available_count FROM availability_slots WHERE staff_id='{STAFF_ID}' AND is_available = true`

**Expected:**
- All Tuesday slots for this staff become `is_available = true`
- `staff_working_hours` record has `is_active = false`

---

### TEST 8: Working Hours Deletion → Release Daily Slots
**Steps:**
1. Delete a working hours entry for a specific day
2. Check that slots for that day are released

**Expected:**
- All slots for that day and staff become `is_available = true`

---

## Database Queries for Verification

Get all slots for a staff/date:
```sql
SELECT 
  id, start_time, end_time, is_available, 
  reserved_until, reserved_by_session,
  EXTRACT(HOUR FROM start_time) as hour
FROM availability_slots 
WHERE staff_id = '{STAFF_ID}' 
  AND DATE(start_time) = '2026-02-25'
ORDER BY start_time;
```

Get slot summary:
```sql
SELECT 
  is_available, 
  COUNT(*) as count,
  reserved_until IS NOT NULL as is_reserved
FROM availability_slots 
WHERE staff_id = '{STAFF_ID}' 
  AND DATE(start_time) = '2026-02-25'
GROUP BY is_available, reserved_until IS NOT NULL
ORDER BY is_available DESC;
```

---

## Log Inspection

Check server logs for messages:
- `✅ Released {count} overlapping slots`
- `✅ Invalidated {count} overlapping slots`
- `✅ Released {count} slots for deleted working hours`
- etc.

These confirm the slot manager operations are executing.
