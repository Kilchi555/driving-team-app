# Quick Manual Testing Guide (15 min)

Schnelle Checkliste für essenzielle Manual Tests ohne viel Aufwand.

**Time:** ~15 minutes  
**Required:** Browser + Server running on port 3000

---

## Setup (2 min)

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Run auto tests
npm run test:validators
```

Expected output:
```
✓ All validation tests passed!
Total Tests:   26
Success Rate:  100%
```

Open browser: **http://localhost:3000**

---

## Test Scenarios (13 min)

### 1. Valid Appointment (2 min)

1. Open Calendar
2. Click on future time slot
3. Fill in:
   - Student: any
   - Instructor: any
   - Date: tomorrow
   - Time: 10:00-11:00
   - Category: B
   - Title: "Fahrstunde"
4. Click Save

**Expected:** ✅ Appointment visible in calendar, no errors

---

### 2. XSS in Title (2 min)

1. Click time slot
2. Title field: `<script>alert(1)</script>Test`
3. Click Save

**Expected:** ✅ Saved, no alert appears, `<script>` removed

---

### 3. Invalid Duration (2 min)

1. Click time slot
2. Duration: **5 minutes**
3. Click Save

**Expected:** ✗ Error message: "mindestens 15 Minuten"

---

### 4. Negative Payment Amount (2 min)

1. Go to Payments
2. Click Pay
3. Amount: **-100**
4. Click Pay

**Expected:** ✗ Error message: "größer als 0 sein"

---

### 5. Invalid Email (2 min)

1. Go to Payments
2. Click Pay
3. Email: **invalid-email**
4. Click Pay

**Expected:** ✗ Error message: "Ungültige E-Mail"

---

### 6. Check Console (1 min)

1. Open DevTools (F12)
2. Console Tab
3. Perform all above tests
4. Look for red errors

**Expected:** ✅ No red errors, only expected HTTP 400s

---

## Results

| Test | Expected | Result | Status |
|------|----------|--------|--------|
| 1. Valid Appointment | ✅ Save | | ☐ PASS ☐ FAIL |
| 2. XSS Prevention | ✅ Save, no alert | | ☐ PASS ☐ FAIL |
| 3. Duration Validation | ✗ Error | | ☐ PASS ☐ FAIL |
| 4. Amount Validation | ✗ Error | | ☐ PASS ☐ FAIL |
| 5. Email Validation | ✗ Error | | ☐ PASS ☐ FAIL |
| 6. No Console Errors | ✅ Clean | | ☐ PASS ☐ FAIL |

**Overall:** ☐ ALL PASS ☐ SOME FAIL

---

## Common Issues & Fixes

### Issue: Error message not shown
**Fix:** Check console (F12) for actual error

### Issue: XSS alert appears
**Fix:** Validation not working - check validator imports

### Issue: Slow response (> 500ms)
**Fix:** Check Network tab - database query slow?

### Issue: Appointment not saved
**Fix:** Check browser console + server logs for errors

---

## Sign-Off

**Tested by:** _________________  
**Date:** _________________  

**Result:** ☐ PASS ☐ FAIL

**Issues found:**
```
_________________________________________________________________
_________________________________________________________________
```

---

For detailed testing, see: **BROWSER_TESTING_CHECKLIST.md**



