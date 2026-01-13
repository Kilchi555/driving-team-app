# Browser Manual Testing Checklist

Comprehensive checklist für manuelles Testing der Input Validation in Browser & Mobile.

**Test Date:** _________________  
**Tested By:** _________________  
**Browser:** _________________  
**OS:** _________________

---

## Pre-Test Setup

- [ ] Server läuft: `npm run dev` (Port 3000)
- [ ] Browser Cache geleert (Cmd+Shift+R)
- [ ] Console offen (F12)
- [ ] Network Tab offen (für API Calls)
- [ ] Angemeldet als Test User

---

## Test 1: Appointment Creation - Valid Input

**Goal:** Neuen Termin mit gültigen Daten erstellen

### Steps:
1. [ ] Kalender-View öffnen
2. [ ] Click auf zukünftiges Zeitfenster
3. [ ] EventModal öffnet sich
4. [ ] Fülle aus:
   - Student: _(beliebig)_
   - Instructor: _(beliebig)_
   - Date: _(Morgen oder später)_
   - Time: 10:00 - 11:00
   - Category: B
   - Title: "Fahrstunde"
5. [ ] Click "Speichern"

### Expected Results:
- [ ] HTTP 200 Response in Network Tab
- [ ] Event sofort im Calendar sichtbar
- [ ] Keine Error Messages
- [ ] Keine Console Errors
- [ ] Success Toast/Notification

### Evidence:
```
✓ Appointment created successfully
✓ No console errors
✓ Event visible in calendar
```

---

## Test 2: Appointment Creation - Invalid Duration

**Goal:** Duration < 15 min sollte abgelehnt werden

### Steps:
1. [ ] Click auf Zeitfenster im Calendar
2. [ ] EventModal öffnet sich
3. [ ] Setze Duration auf **5 Minuten**
4. [ ] Versuche zu speichern

### Expected Results:
- [ ] HTTP 400 Response
- [ ] Error Message: "Dauer muss mindestens 15 Minuten betragen"
- [ ] Appointment wird **NICHT** erstellt
- [ ] Modal bleibt offen

### Evidence:
```
Browser Console:
POST /api/appointments/save 400 Bad Request
Error: "duration_minutes: Dauer muss mindestens 15 Minuten betragen"

✓ Error displayed to user
✓ Appointment not created
```

---

## Test 3: Appointment Creation - XSS in Title

**Goal:** `<script>` Tag in Title sollte sanitiert werden

### Steps:
1. [ ] Click auf Zeitfenster
2. [ ] EventModal öffnet sich
3. [ ] Title Field füllen mit: `<script>alert('xss')</script>Fahrstunde`
4. [ ] Speichern

### Expected Results:
- [ ] HTTP 200 Response
- [ ] Title wird **sanitiert** (kein `<script>` in DB)
- [ ] Keine JavaScript Alert
- [ ] Keine Console Errors
- [ ] Appointment mit sanitiertem Title erstellt

### Evidence:
```
Browser Console:
POST /api/appointments/save 200 OK

Database Check:
SELECT title FROM appointments WHERE id = '...'
Result: "Fahrstunde" (not "Fahrstunde<script>...")

✓ XSS prevented
✓ Appointment saved
```

---

## Test 4: Appointment Creation - HTML Injection

**Goal:** HTML Tags in Description sollten entfernt werden

### Steps:
1. [ ] Click auf Zeitfenster
2. [ ] EventModal öffnet sich
3. [ ] Description füllen mit: `<img src=x onerror="alert(1)">`
4. [ ] Speichern

### Expected Results:
- [ ] HTTP 200 Response
- [ ] HTML Tag wird entfernt
- [ ] Keine JavaScript Alert
- [ ] Description ist leer oder sanitiert

### Evidence:
```
✓ HTML injection prevented
✓ No alert triggered
✓ Appointment created
```

---

## Test 5: Payment - Invalid Amount (Negative)

**Goal:** Negative Beträge sollten abgelehnt werden

### Steps:
1. [ ] Zu Payments Seite navigieren
2. [ ] Click "Zahlen" auf einen Termin
3. [ ] Payment Modal öffnet sich
4. [ ] Versuche Betrag zu editieren auf `-100`
5. [ ] Versuche zu zahlen

### Expected Results:
- [ ] Validation Error vor HTTP Request
- [ ] Error Message: "Betrag muss größer als 0 sein"
- [ ] Payment wird **NICHT** initiiert
- [ ] Modal bleibt offen

### Evidence:
```
✓ Client-side validation triggered
✓ No negative payment created
```

---

## Test 6: Payment - Invalid Email

**Goal:** Ungültige Email sollte abgelehnt werden

### Steps:
1. [ ] Zu Payments Seite navigieren
2. [ ] Click "Zahlen"
3. [ ] Payment Modal öffnet sich
4. [ ] Email Field editieren zu: `invalid-email`
5. [ ] Versuche zu zahlen

### Expected Results:
- [ ] Validation Error
- [ ] Error Message: "Ungültige E-Mail-Adresse"
- [ ] Payment wird **NICHT** erstellt
- [ ] HTTP 400 Response

### Evidence:
```
Browser Console:
POST /api/payments/create 400 Bad Request
Error: "customerEmail: Ungültige E-Mail-Adresse"

✓ Email validation enforced
```

---

## Test 7: Payment - Valid Amount

**Goal:** Gültiger Betrag sollte funktionieren

### Steps:
1. [ ] Zu Payments Seite navigieren
2. [ ] Click "Zahlen" auf einen Termin
3. [ ] Payment Modal öffnet sich
4. [ ] Betrag: 100 CHF
5. [ ] Email: test@example.com
6. [ ] Click "Mit Wallee zahlen"

### Expected Results:
- [ ] HTTP 200 Response
- [ ] Wallee Modal öffnet sich
- [ ] Keine Validation Errors
- [ ] Keine Console Errors

### Evidence:
```
POST /api/payments/create 200 OK
✓ Wallee payment initiated
```

---

## Test 8: Form Field - Max Length

**Goal:** String Fields sollten Längenbegrenzung haben

### Steps:
1. [ ] Appointment Modal öffnen
2. [ ] Title Field
3. [ ] Paste 500+ Zeichen
4. [ ] Versuche zu speichern

### Expected Results:
- [ ] Text wird gekürzt auf Max Length (255)
- [ ] ODER Error Message angezeigt
- [ ] Appointment mit gekütztem Title erstellt

### Evidence:
```
✓ Max length enforced (title <= 255 chars)
```

---

## Test 9: Date/Time - Past Appointment

**Goal:** Termine in Vergangenheit sollten abgelehnt werden

### Steps:
1. [ ] Calendar öffnen
2. [ ] Versuche auf GESTERN zu klicken
3. [ ] Versuche Termin zu erstellen

### Expected Results:
- [ ] Modal öffnet sich aber Date ist deaktiviert
- [ ] ODER Error: "Termin kann nicht in der Vergangenheit liegen"
- [ ] Appointment wird **NICHT** erstellt

### Evidence:
```
✓ Past appointments rejected
```

---

## Test 10: UUID Validation - Invalid ID

**Goal:** Ungültige UUIDs sollten abgelehnt werden

### Steps:
1. [ ] Developer Tools öffnen
2. [ ] API Call manuell ausführen mit ungültiger user_id:
```bash
curl -X POST http://localhost:3000/api/booking/create-appointment \
  -H "Content-Type: application/json" \
  -d '{"user_id":"invalid-uuid","staff_id":"1c492300-d9b5-4339-8c57-ae2d7e972197","start_time":"2025-12-31T10:00:00Z","end_time":"2025-12-31T11:00:00Z","duration_minutes":60,"type":"B","tenant_id":"64259d68-195a-4c68-8875-f1b44d962830"}'
```

### Expected Results:
- [ ] HTTP 400 Response
- [ ] Error: "Ungültige Benutzer-ID"
- [ ] Appointment wird **NICHT** erstellt

### Evidence:
```
HTTP 400 Bad Request
Response: "user_id: Ungültige Benutzer-ID"

✓ UUID validation enforced
```

---

## Test 11: Category Selection - Invalid

**Goal:** Ungültige Fahrkategorien sollten abgelehnt werden

### Steps:
1. [ ] API Call mit ungültiger Category:
```bash
curl -X POST http://localhost:3000/api/booking/create-appointment \
  -H "Content-Type: application/json" \
  -d '{"user_id":"e2b162da-959f-47b0-b90b-3b5f153f2483","staff_id":"1c492300-d9b5-4339-8c57-ae2d7e972197","start_time":"2025-12-31T10:00:00Z","end_time":"2025-12-31T11:00:00Z","duration_minutes":60,"type":"INVALID","tenant_id":"64259d68-195a-4c68-8875-f1b44d962830"}'
```

### Expected Results:
- [ ] HTTP 400 Response
- [ ] Error: "Ungültige Fahrkategorie"
- [ ] Appointment wird **NICHT** erstellt

### Evidence:
```
HTTP 400 Bad Request
Error: "type: Ungültige Fahrkategorie"

✓ Category validation enforced
```

---

## Test 12: Payment Method - Invalid

**Goal:** Ungültige Payment Methods sollten abgelehnt werden

### Steps:
1. [ ] API Call mit ungültiger Method:
```bash
curl -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{"userId":"e2b162da-959f-47b0-b90b-3b5f153f2483","amount":10000,"customerEmail":"test@example.com","paymentMethod":"bitcoin","currency":"CHF"}'
```

### Expected Results:
- [ ] HTTP 400 Response
- [ ] Error: "Ungültige Zahlungsmethode"

### Evidence:
```
HTTP 400 Bad Request
Error: "paymentMethod: Ungültige Zahlungsmethode"

✓ Payment method validation enforced
```

---

## Test 13: Console - No Errors

**Goal:** Bei normaler Nutzung sollte keine Errors in Console sein

### Steps:
1. [ ] Alle oberen Tests durchführen
2. [ ] Console Tab beobachten
3. [ ] Nach Errors suchen

### Expected Results:
- [ ] Keine **roten** Error Messages
- [ ] Nur gelbe Warnings (falls Vite/Development)
- [ ] Validation Errors sind **HTTP 400**, nicht Console Errors

### Evidence:
```
Console:
- No red errors
- No uncaught exceptions
- No undefined variables

✓ Application runs cleanly
```

---

## Test 14: Network - Response Times

**Goal:** Validation sollte schnell sein (< 100ms)

### Steps:
1. [ ] Network Tab öffnen
2. [ ] Valid Appointment erstellen
3. [ ] Beobachte POST /api/booking/create-appointment
4. [ ] Check Response Time

### Expected Results:
- [ ] Response Time: **< 100ms**
- [ ] Keine Timeout Errors
- [ ] HTTP 200 OK

### Evidence:
```
Network Tab:
POST /api/booking/create-appointment
Status: 200 OK
Time: 45ms

✓ Fast response
```

---

## Test 15: Mobile - Touch Interactions

**Goal:** Validation sollte auf Mobile funktionieren

### Steps:
1. [ ] Browser DevTools → Mobile View (375px width)
2. [ ] Appointment erstellen
3. [ ] Mit XSS-Title versuchen
4. [ ] Payment versuchen

### Expected Results:
- [ ] Alle Validations funktionieren
- [ ] No Layout Issues
- [ ] Touch Inputs reagieren
- [ ] Error Messages sichtbar

### Evidence:
```
Mobile (375px):
✓ Appointment validation works
✓ XSS prevention works
✓ Payment validation works
✓ No console errors
```

---

## Test 16: Real-World Scenario - Complete Workflow

**Goal:** Full flow von Create → Payment → Cancel

### Steps:
1. [ ] Erstelle gültigen Appointment
2. [ ] Zahle damit (valid amount)
3. [ ] Versuche zu cancellen
4. [ ] Gib negatives Refund ein (sollte ablehnen)

### Expected Results:
- [ ] Appointment erstellt ✓
- [ ] Payment successful ✓
- [ ] Cancellation works ✓
- [ ] Negative refund rejected ✓

### Evidence:
```
✓ Full workflow validation passed
✓ All validations enforced
```

---

## Test 17: Error Messages - User Friendly

**Goal:** Error Messages sollten klar & hilfreich sein

### Steps:
1. [ ] Führe mehrere Validations Fehler aus
2. [ ] Lese Error Messages
3. [ ] Sind sie verständlich?

### Expected Results:
- [ ] Error Messages auf **Deutsch**
- [ ] Sagen welches Feld fehlerhaft ist
- [ ] Sagen warum es fehlerhaft ist
- [ ] Keine technischen Details

### Examples:
```
❌ Ungültig:
"Validierungsfehler: duration_minutes"

✅ Gut:
"Dauer muss mindestens 15 Minuten betragen"
```

### Evidence:
```
✓ Error messages are clear
✓ User knows what to fix
```

---

## Test 18: Security - No Data Leakage

**Goal:** Sensitive Daten sollten nicht geloggt werden

### Steps:
1. [ ] Appointment mit Daten erstellen
2. [ ] Network Tab → Response anschauen
3. [ ] Console → Logs anschauen
4. [ ] Suche nach Passwords, Tokens, sensitive Info

### Expected Results:
- [ ] Keine Passwords in Response
- [ ] Keine Auth Tokens geloggt
- [ ] Keine sensitive Daten in Console

### Evidence:
```
✓ No sensitive data leaked
✓ Secure logging
```

---

## Test 19: Rate Limiting (Optional)

**Goal:** Zu viele Requests sollten blockiert werden

### Steps:
1. [ ] Schnell hintereinander 50+ Requests senden:
```bash
for i in {1..50}; do
  curl -X POST http://localhost:3000/api/payments/create ...
done
```

### Expected Results:
- [ ] Nach X Requests: HTTP 429 (Too Many Requests)
- [ ] Error: "Zu viele Versuche"
- [ ] Weitere Requests werden blockiert

### Evidence:
```
Request 1-30: 200 OK
Request 31-50: 429 Too Many Requests

✓ Rate limiting works
```

---

## Summary

Total Tests: 19  
Passed: ___/19  
Failed: ___/19  
Success Rate: ____%

### Critical Issues Found:
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

### Minor Issues:
```
_________________________________________________________________
_________________________________________________________________
```

### Performance Notes:
```
Average Response Time: ____ms
Slowest Endpoint: ____
Fastest Endpoint: ____
```

---

## Sign-Off

- [ ] All critical tests passed
- [ ] No security issues found
- [ ] Error messages are clear
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Mobile works correctly

**Tested by:** _________________  
**Date:** _________________  
**Status:** ☐ PASS | ☐ FAIL | ☐ NEEDS REVIEW

**Comments:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

