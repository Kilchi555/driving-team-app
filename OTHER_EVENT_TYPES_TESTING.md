# Other Event Types - Testing Guide

## ✅ Implementation Complete!

**What was done:**
1. ✅ Backend validation in `/api/appointments/save.post.ts`
2. ✅ Button enabled in `EventModal.vue`
3. ✅ No RLS policies needed (API is the gatekeeper!)

---

## 🧪 Testing Steps

### Test Case 1: Create Meeting (Other Event Type)

**Precondition:**
- You're logged in as Staff or Admin
- You have a past appointment saved

**Steps:**
1. Open EventModal in EDIT mode
2. Click "Typ ändern" button
3. Select event type: "Meeting" or "Team Meeting" or "Training"
4. Enter title: "Team Meeting - Q1 Planning"
5. Set duration: 90 minutes
6. Assign staff (staff selector should show)
7. Save

**Expected Result:**
- ✅ Appointment saved
- ✅ event_type_code = 'meeting' (or selected type)
- ✅ type = null (NOT 'B', 'A', etc.)
- ✅ user_id = null (no student!)
- ✅ duration_minutes = 90
- ✅ **NO payment created** (check payments table - should be empty for this appointment)
- ✅ Staff can see in calendar

**SQL Check:**
```sql
SELECT 
  id,
  title,
  event_type_code,
  type,
  user_id,
  staff_id,
  duration_minutes,
  status,
  (SELECT COUNT(*) FROM payments WHERE appointment_id = appointments.id) as payment_count
FROM appointments
WHERE title LIKE '%Meeting%'
ORDER BY created_at DESC
LIMIT 5;

-- Expected: event_type_code != 'lesson', type = NULL, user_id = NULL, payment_count = 0
```

---

### Test Case 2: Verify No Payment Created

**Steps:**
1. From Test Case 1, note the appointment ID
2. In Supabase SQL Editor:

```sql
SELECT * FROM payments 
WHERE appointment_id = '[appointment-id-from-step-1]';
```

**Expected Result:**
- ✅ NO rows returned (no payment for other types!)

---

### Test Case 3: Check Staff Can See in Calendar

**Steps:**
1. Login as the staff member who was assigned
2. Go to Calendar/Dashboard
3. Look for the meeting in the calendar

**Expected Result:**
- ✅ Meeting appears in calendar
- ✅ Shows correct title
- ✅ Shows correct duration
- ✅ No price shown (since it's free!)

---

### Test Case 4: Verify Working Hours Data

**Steps:**
1. Create 2-3 meetings with different durations
2. In Supabase SQL Editor:

```sql
SELECT 
  event_type_code,
  COUNT(*) as event_count,
  SUM(duration_minutes) as total_minutes,
  SUM(duration_minutes) / 60.0 as total_hours
FROM appointments
WHERE staff_id = '[staff-id]'
  AND event_type_code IN ('meeting', 'training', 'team_meeting')
  AND deleted_at IS NULL
GROUP BY event_type_code;
```

**Expected Result:**
- ✅ Shows meetings/trainings with total hours
- ✅ Correct duration sum
- ✅ Data ready for Staff Working Hours Report

---

### Test Case 5: Security - Try to Create Without Staff

**Steps:**
1. Try to create meeting WITHOUT selecting staff
2. Click Save

**Expected Result:**
- ✅ Error message: "Staff erforderlich für diese Terminart"
- ❌ NO appointment created

**SQL Check:**
```sql
SELECT COUNT(*) FROM appointments 
WHERE title LIKE '%test%' 
  AND event_type_code = 'meeting'
  AND staff_id IS NULL;
-- Expected: 0 rows (security working!)
```

---

### Test Case 6: Verify User ID is Null

**Steps:**
1. Create meeting (don't select student)
2. Check DB:

```sql
SELECT id, title, user_id, event_type_code 
FROM appointments 
WHERE event_type_code = 'meeting' 
AND created_at > now() - interval '5 minutes'
LIMIT 1;
```

**Expected Result:**
- ✅ user_id is NULL (not an empty string or 0!)

---

## 🚀 Next Steps (Future Enhancements)

### Phase 2: Staff Working Hours Dashboard
- [ ] Create `/api/admin/staff-working-hours` API
- [ ] Add working hours widget to admin dashboard
- [ ] Show: Name, Total Hours, Events by Type

### Phase 3: Attendance Tracking
- [ ] Add "attendance" field to appointments
- [ ] Mark attended/not attended
- [ ] Only count attended hours in reports

### Phase 4: Integration with Payroll
- [ ] Export working hours for payroll
- [ ] Calculate staff compensation
- [ ] Audit trail for changes

---

## 🐛 Troubleshooting

### Issue: Meeting created but no `event_type_code`
**Solution:** Check if event_type_code was sent from frontend. Should be in `appointmentData.appointment_type`

### Issue: Payment was created (shouldn't happen!)
**Solution:** Check the condition `isOtherEventType`. Verify that lesson-type check is correct.

### Issue: Staff can't see the meeting
**Solution:** 
- Check `staff_id` is set correctly
- Check `deleted_at` is null
- Check tenant_id matches

---

## ✅ Success Criteria

All tests pass when:
- [x] Meetings created without payments
- [x] No student required for meetings
- [x] Type field is null
- [x] Staff must be assigned
- [x] Duration tracked correctly
- [x] Working hours data queryable

---

**Ready to test?** Let me know if you need help with any test case! 🚀

