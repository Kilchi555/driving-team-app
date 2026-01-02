# Input Validation Testing Guide

Comprehensive guide für Testing der Input Validation Library.

## Quick Start

### 1. Unit Tests ausführen (Vitest)

```bash
# Alle Validators testen
npm run test:validators

# Mit Watch-Modus (auto-reload)
npm run test:watch

# Mit Coverage Report
npm run test:coverage
```

### 2. API Tests ausführen (cURL/Bash)

```bash
# Alle API Endpoints testen
bash test-api-validation.sh

# Oder:
npm run test:api
```

## Unit Tests (Vitest)

Die Unit Tests befinden sich in `server/utils/__tests__/validators.test.ts`.

### Test-Struktur

```
✓ String Validators
  ✓ sanitizeString
    - Removes XSS vectors
    - Removes HTML tags
    - Removes event handlers
    - Respects maxLength
    - Trims whitespace
  ✓ validateEmail
  ✓ validatePassword
  ✓ validateUUID
  ✓ validateRequiredString

✓ Numeric Validators
  ✓ validatePositiveNumber
  ✓ validateAmount
  ✓ validateDuration

✓ Date/Time Validators
  ✓ validateISODate
  ✓ validateAppointmentTimes

✓ Enum Validators
  ✓ validateDrivingCategory
  ✓ validateEventType
  ✓ validatePaymentStatus
  ✓ validatePaymentMethod

✓ Complex Validators
  ✓ validateAppointmentData
  ✓ validatePaymentData

✓ Integration Tests
  - Real appointment booking flow
  - Real payment flow
  - XSS prevention
```

### Test-Coverage

```
✓ 60+ Unit Tests
✓ 100+ Assertions
✓ Positive & Negative Cases
✓ Edge Cases (null, undefined, empty)
✓ Real-world Integration Scenarios
```

### Beispiel: Unit Test ausführen

```bash
$ npm run test:validators

 ✓ String Validators (6)
   ✓ sanitizeString (6)
   ✓ validateEmail (4)
   ✓ validatePassword (6)
   ✓ validateUUID (4)
   ✓ validateRequiredString (5)

 ✓ Numeric Validators (9)
   ✓ validatePositiveNumber (5)
   ✓ validateAmount (5)
   ✓ validateDuration (5)

 ✓ Date/Time Validators (5)
   ✓ validateISODate (3)
   ✓ validateAppointmentTimes (4)

 ✓ Enum Validators (13)
   ✓ validateDrivingCategory (4)
   ✓ validateEventType (3)
   ✓ validatePaymentStatus (3)
   ✓ validatePaymentMethod (3)

 ✓ Complex Validators (8)
   ✓ validateAppointmentData (5)
   ✓ validatePaymentData (5)

 ✓ Integration Tests (4)

Test Files  1 passed (1)
Tests      60 passed (60)
Assertions 100+ passed
```

## API Tests (cURL/Bash)

Die API Tests befinden sich in `test-api-validation.sh`.

### Test-Szenarien

#### 1. Appointment Creation Tests

```bash
✓ Create valid appointment (HTTP 200)
✗ Missing required fields (HTTP 400)
✗ Invalid UUID format (HTTP 400)
✗ Invalid driving category (HTTP 400)
✗ Invalid duration - too short (HTTP 400)
```

#### 2. Payment Creation Tests

```bash
✓ Create valid payment (HTTP 200)
✗ Invalid email format (HTTP 400)
✗ Negative amount (HTTP 400)
✗ Invalid payment method (HTTP 400)
```

#### 3. XSS Prevention Tests

```bash
✓ Sanitize XSS in title (HTTP 200, sanitized)
✓ Sanitize HTML injection (HTTP 200, sanitized)
```

#### 4. Slot Reservation Tests

```bash
✓ Reserve valid slot (HTTP 200)
✗ Invalid times - start >= end (HTTP 400)
```

### Beispiel: API Tests ausführen

```bash
$ bash test-api-validation.sh

=========================================
  API VALIDATION TESTS
=========================================

=== APPOINTMENT CREATION TESTS ===

Testing: Create valid appointment
  Method: POST /booking/create-appointment
  Expected: HTTP 200
  ✓ PASS (HTTP 200)
  Response: {"success":true,"data":{"id":"...","user_id":"..."...

Testing: Missing required fields (should fail)
  Method: POST /booking/create-appointment
  Expected: HTTP 400
  ✓ PASS (HTTP 400)
  Response: {"success":false,"message":"Validierungsfehler: user_id: Ungültige..."...

Testing: Invalid UUID format (should fail)
  Method: POST /booking/create-appointment
  Expected: HTTP 400
  ✓ PASS (HTTP 400)
  Response: {"success":false,"message":"Validierungsfehler: user_id: Ungültige..."...

...

=========================================
  VALIDATION TESTS COMPLETED
=========================================
```

## Manual Testing

### Test 1: XSS Prevention

```bash
curl -X POST http://localhost:3000/api/appointments/save \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "create",
    "appointmentData": {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "staff_id": "550e8400-e29b-41d4-a716-446655440001",
      "title": "<script>alert(\"xss\")</script>Fahrstunde",
      "start_time": "2025-12-31T10:00:00Z",
      "end_time": "2025-12-31T11:00:00Z",
      "duration_minutes": 60,
      "type": "B",
      "tenant_id": "550e8400-e29b-41d4-a716-446655440002"
    }
  }'
```

Expected Response:
- ✓ HTTP 200
- ✓ Title is sanitized (no `<script>`)
- ✓ Title becomes "Fahrstunde"

### Test 2: Invalid Duration

```bash
curl -X POST http://localhost:3000/api/booking/create-appointment \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "staff_id": "550e8400-e29b-41d4-a716-446655440001",
    "start_time": "2025-12-31T10:00:00Z",
    "end_time": "2025-12-31T11:00:00Z",
    "duration_minutes": 5,
    "type": "B",
    "tenant_id": "550e8400-e29b-41d4-a716-446655440002"
  }'
```

Expected Response:
- ✗ HTTP 400
- Error: "Validierungsfehler: duration_minutes: Dauer muss mindestens 15 Minuten betragen"

### Test 3: Invalid Email

```bash
curl -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 10000,
    "customerEmail": "not-an-email",
    "paymentMethod": "wallee",
    "currency": "CHF"
  }'
```

Expected Response:
- ✗ HTTP 400
- Error: "Validierungsfehler: customerEmail: Ungültige E-Mail-Adresse"

## Postman Collection

Import `postman_validation_tests.json` in Postman für graphical testing:

```json
{
  "info": {
    "name": "Validation Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Appointment - Valid",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/api/booking/create-appointment"
        // ...
      }
    },
    {
      "name": "Appointment - Invalid Duration",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/api/booking/create-appointment"
        // ...
      }
    }
    // ... more tests
  ]
}
```

## Debugging

### Verbose Output aktivieren

```bash
# In validators.ts:
logger.debug('Validating appointment:', data)
logger.debug('Validation result:', validation)
logger.debug('Errors:', validation.errors)
```

### Server Logs prüfen

```bash
# Terminal wo `npm run dev` läuft:
📋 Saving appointment via API: { mode: "create", ... }
📋 Validating appointment...
✅ Validation passed
```

### Tests mit Coverage ausführen

```bash
npm run test:coverage

# Output:
File                    | % Stmts | % Branch | % Funcs | % Lines
validators.ts           |   100  |   98    |   100  |   100
```

## CI/CD Integration

### GitHub Actions Beispiel

```yaml
name: Validation Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - run: npm install
      - run: npm run test:validators
      - run: npm run test:coverage
```

## Best Practices

1. **Regelmäßig testen**: Vor jedem Commit `npm run test:validators` ausführen
2. **Coverage checken**: Mindestens 80% Code Coverage anstreben
3. **Negative Cases testen**: Nicht nur Happy Path, auch Fehlerfall
4. **Real-world Daten**: Mit echten UUIDs und Datumsformaten testen
5. **Edge Cases**: null, undefined, leere Strings, etc.

## Roadmap

- [ ] Integration Tests für API Endpoints
- [ ] Performance Benchmarks (validation speed)
- [ ] Generative Testing (Fuzzing)
- [ ] Property-based Testing
- [ ] Mutation Testing
- [ ] Load Testing
- [ ] Contract Testing (API Specs)

## Troubleshooting

### Problem: "Vitest not found"

```bash
npm install --save-dev vitest @vitest/ui
npm run test:validators
```

### Problem: "Port 3000 already in use"

```bash
lsof -i :3000
kill -9 <PID>
npm run dev
```

### Problem: "Test hangs"

```bash
# Mit timeout:
npm run test:validators -- --reporter=verbose

# Oder kill nach 30s:
timeout 30 npm run test:validators
```

## Support

- Unit Tests: `npm run test:validators`
- API Tests: `bash test-api-validation.sh`
- Watch Mode: `npm run test:watch`
- Coverage: `npm run test:coverage`

Questions? Check `VALIDATION_GUIDE.md` für Validator-Dokumentation.



