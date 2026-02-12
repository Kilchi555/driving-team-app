# 🔒 Security Testing Guide

## Quick Start

### Run the Automated API Tests
```bash
cd /Users/pascalkilchenmann/driving-team-app
chmod +x TEST_SECURITY_FIXES.sh
./TEST_SECURITY_FIXES.sh
```

The script will prompt you to:
1. Enter your auth token from your browser's DevTools
2. Enter your tenant_id

---

## Manual UI Testing Checklist

### 1. Staff Settings - External Calendars (sync-ics.post.ts)

**Test: Load External Calendars**
```
1. Login as STAFF
2. Go to Settings → Staff Settings
3. Look for "External Calendars" or "Kalender" section
4. Click "Load Calendars" or similar button
5. ✅ Should show your connected calendars
6. ✅ Should NOT show other staff's calendars
```

**Test: Connect ICS Calendar**
```
1. In the same section, click "Add Calendar" or "Connect"
2. Select "ICS URL" as provider
3. Enter a calendar URL (e.g., from Google Calendar export)
4. ✅ Should successfully connect
5. ✅ Calendar should appear in your list
6. ✅ Other staff should NOT see this calendar
```

**Test: Disconnect Calendar**
```
1. In your calendar list, find a calendar you want to remove
2. Click disconnect/delete button
3. ✅ Calendar should be removed
4. ❌ Should NOT be able to disconnect other users' calendars
```

### 2. Calendar Booking Flow (calendar/manage.post.ts)

**Test: Create Appointment**
```
1. Go to Calendar View
2. Try to book an appointment
3. ✅ Should work for your own tenant
4. ✅ Should see correct pricing rules
5. ✅ Should see available staff slots
```

**Test: Update Appointment**
```
1. Click on an existing appointment
2. Edit the time/details
3. ✅ Should save successfully
4. ❌ Should NOT be able to edit appointments from other tenants
```

**Test: Get Appointment List**
```
1. View calendar for a date range
2. ✅ Should only show your appointments
3. ✅ Should show correct count
4. ❌ Should NOT show other tenants' appointments
```

### 3. Payment Handling (calendar/manage.post.ts get-payment)

**Test: Get Payment Info**
```
1. Create/find an appointment with payment
2. Open appointment details
3. ✅ Should show payment status
4. ✅ Should show correct amount
5. ❌ Should NOT show payment from other tenants
```

### 4. Security - Cross-Tenant Access Prevention

**Test: Attempt unauthorized access (for developers)**

In browser console, try:
```javascript
// This should FAIL with 403 (before would have worked!)
fetch('/api/calendar/manage', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'get-tenant-data',
    tenant_id: 'OTHER_TENANT_ID' // Different from your tenant
  })
}).then(r => r.json()).then(console.log)
```

Should get: `403 - Access denied to this tenant`

---

## Detailed Test Scenarios

### Scenario 1: Unauthenticated Access
```bash
# This should FAIL with 401
curl -X POST http://localhost:3000/api/staff/external-calendars \
  -H 'Content-Type: application/json' \
  -d '{"action":"load"}'
```

Expected: `401 - Authentication required`

### Scenario 2: Own Calendar Access (should work)
```bash
# This should SUCCEED with 200
curl -X POST http://localhost:3000/api/staff/external-calendars \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"action":"load"}'
```

Expected: `200 - List of your calendars`

### Scenario 3: Disconnect Other User's Calendar
```bash
# Get a calendar_id from another staff member
# Then try to disconnect it (should FAIL with 403)

curl -X POST http://localhost:3000/api/staff/external-calendars \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "action":"disconnect",
    "data":{"calendarId":"OTHER_STAFF_CALENDAR_ID"}
  }'
```

Expected: `403 - You do not have permission to disconnect this calendar`

---

## What Was Fixed

### Before (Vulnerable)
- ❌ `external-calendars.post.ts` trusted `authUserId` from client → **Auth Spoofing**
- ❌ `sync-ics.post.ts` had no authentication check → **Unauthenticated Access**
- ❌ `calendar/manage.post.ts` had no authentication → **Complete Open Access**
- ❌ No tenant isolation checks → **Cross-Tenant Data Leaks**

### After (Secure)
- ✅ Authentication verified server-side on ALL endpoints
- ✅ User identity derived from session token (not client input)
- ✅ Tenant isolation enforced on all operations
- ✅ Resource ownership verified before modifications
- ✅ All unauthorized attempts logged as warnings

---

## Important Notes

1. **Token Location**: Open DevTools (F12) → Application → Cookies → Find `sb-auth-token`
2. **Tenant ID**: You can find your tenant_id in the browser console:
   ```javascript
   // In any authenticated page's console:
   JSON.parse(localStorage.getItem('user_profile')).tenant_id
   ```
3. **Logs**: Check server logs for security warnings when testing unauthorized access attempts

---

## Success Criteria

✅ All API endpoints return 401 for unauthenticated requests
✅ All API endpoints validate tenant ownership
✅ Calendar operations only affect own calendars
✅ UI shows only own calendars, not others'
✅ Booking flow works without errors
✅ No cross-tenant data leaks
