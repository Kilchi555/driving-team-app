# Input Validation Testing Checklist

## Pre-Deployment Checklist

### 1. Unit Tests

- [ ] `npm run test:validators` - Alle Tests grün?
- [ ] Coverage >= 80%?
- [ ] Keine Test Warnings?
- [ ] Tests laufen < 10 Sekunden?

```bash
npm run test:validators
npm run test:coverage
```

### 2. API Tests (Manual)

#### Appointment Creation

- [ ] ✓ Valid appointment erstellen
- [ ] ✗ Missing required fields (400)
- [ ] ✗ Invalid UUID (400)
- [ ] ✗ Invalid category (400)
- [ ] ✗ Duration < 15min (400)
- [ ] ✗ Duration > 480min (400)
- [ ] ✗ Start >= End (400)
- [ ] ✗ Appointment in Vergangenheit (400)

```bash
# Valid
curl -X POST http://localhost:3000/api/booking/create-appointment \
  -H "Content-Type: application/json" \
  -d '{"user_id":"...","staff_id":"...","start_time":"2025-12-31T10:00:00Z","end_time":"2025-12-31T11:00:00Z","duration_minutes":60,"type":"B","tenant_id":"..."}'

# Expected: HTTP 200
```

#### Payment Creation

- [ ] ✓ Valid payment erstellen
- [ ] ✗ Invalid email (400)
- [ ] ✗ Negative amount (400)
- [ ] ✗ Non-integer amount (400)
- [ ] ✗ Invalid payment method (400)
- [ ] ✗ Wrong currency (400)

```bash
# Valid
curl -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{"userId":"...","amount":10000,"customerEmail":"test@example.com","paymentMethod":"wallee","currency":"CHF"}'

# Expected: HTTP 200
```

#### XSS Prevention

- [ ] ✓ `<script>` wird entfernt
- [ ] ✓ `<img onerror>` wird entfernt
- [ ] ✓ `javascript:` wird entfernt
- [ ] ✓ `on*=` Event Handlers werden entfernt

```bash
# XSS Test
curl -X POST http://localhost:3000/api/appointments/save \
  -H "Content-Type: application/json" \
  -d '{"mode":"create","appointmentData":{"user_id":"...","staff_id":"...","title":"<script>alert(1)</script>Test","start_time":"2025-12-31T10:00:00Z","end_time":"2025-12-31T11:00:00Z","duration_minutes":60,"type":"B","tenant_id":"..."}}'

# Expected: HTTP 200 + Title sanitized
```

### 3. Security Tests

- [ ] No console.log of sensitive data
- [ ] No hardcoded credentials
- [ ] No SQL Injection vectors
- [ ] No XXE vulnerabilities
- [ ] All inputs sanitized

### 4. Error Messages

- [ ] Errors sind aussagekräftig
- [ ] Errors zeigen welches Feld fehlerhaft ist
- [ ] Errors zeigen warum es fehlerhaft ist
- [ ] Keine Stack Traces in Production

### 5. Performance

- [ ] Validation < 10ms pro Request
- [ ] No N+1 Query Problems
- [ ] Memory usage stable
- [ ] No memory leaks

```bash
# Performance Test
time npm run test:validators
# Expected: < 5 Sekunden
```

### 6. Integration

- [ ] Calendar appointment creation works
- [ ] Payment creation works
- [ ] Slot reservation works
- [ ] Staff availability checks work
- [ ] Admin functions work

### 7. Browser Tests

- [ ] Form submission works
- [ ] Error messages angezeigt
- [ ] No client-side errors in console
- [ ] Form validation synced mit Backend

### 8. Mobile Tests

- [ ] Responsive Design OK
- [ ] Touch interactions work
- [ ] No console errors on mobile

### 9. Database

- [ ] No constraint violations
- [ ] No NULL fields in required columns
- [ ] Foreign keys validated
- [ ] Tenant isolation maintained

### 10. Documentation

- [ ] VALIDATION_GUIDE.md updated
- [ ] TESTING_GUIDE.md updated
- [ ] Code comments added
- [ ] Examples provided

## Regression Testing

### Before Deploying to Production

```bash
# 1. Run all tests
npm run test:validators

# 2. Run API tests
bash test-api-validation.sh

# 3. Check for new lint errors
npm run lint

# 4. Build for production
npm run build

# 5. Check bundle size
npm run generate

# 6. Manual smoke tests
# - Create appointment
# - Make payment
# - View calendar
# - Edit appointment
# - Cancel appointment
```

## Test Results

### Unit Tests Template

```
File                         Lines    Stmts    Branch   Funcs    Uncovered Line
validators.ts                450      100%     98%      100%     (line 123, 456)

Total:                        450      100%     98%      100%
```

### API Tests Template

```
=== APPOINTMENT CREATION TESTS ===
✓ Create valid appointment (HTTP 200)
✓ Missing required fields (HTTP 400)
✓ Invalid UUID format (HTTP 400)
✓ Invalid driving category (HTTP 400)
✓ Invalid duration (HTTP 400)
✗ FAILED: Start time in past

=== PAYMENT CREATION TESTS ===
✓ Create valid payment (HTTP 200)
✓ Invalid email (HTTP 400)
✓ Negative amount (HTTP 400)
✓ Invalid payment method (HTTP 400)

=== XSS PREVENTION TESTS ===
✓ Sanitize XSS in title (HTTP 200)
✓ Sanitize HTML injection (HTTP 200)

=== SLOT RESERVATION TESTS ===
✓ Reserve valid slot (HTTP 200)
✓ Invalid times (HTTP 400)

Total: 17 passed, 1 failed
```

## Sign-Off

- [ ] All tests passing
- [ ] Code reviewed
- [ ] No security issues
- [ ] No performance issues
- [ ] Documentation updated
- [ ] Approved for deployment

**Tested by:** _________________  
**Date:** _________________  
**Version:** _________________  

## Notes

```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

## Common Issues

### Issue: "validateEmail is not a function"

**Solution:**
```typescript
// ✓ Correct
import { validateEmail } from '~/server/utils/validators'

// ✗ Wrong
import validateEmail from '~/server/utils/validators'
```

### Issue: "Test timeout"

**Solution:**
```bash
# Increase timeout
npm run test:validators -- --test-timeout=30000

# Or debug
npm run test:validators -- --reporter=verbose
```

### Issue: "API endpoint not responding"

**Solution:**
```bash
# Check if server is running
lsof -i :3000

# Kill and restart
pkill -f "npm run dev"
npm run dev
```

### Issue: "XSS still in title"

**Solution:**
```typescript
// Ensure sanitization happens BEFORE DB insert
const title = sanitizeString(appointmentData.title, 255)
const { data } = await supabase
  .from('appointments')
  .insert({ ...appointmentData, title })
```

## Resources

- [VALIDATION_GUIDE.md](./VALIDATION_GUIDE.md) - Validator Documentation
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Testing Documentation
- [server/utils/validators.ts](./server/utils/validators.ts) - Validator Source
- [server/utils/__tests__/validators.test.ts](./server/utils/__tests__/validators.test.ts) - Unit Tests
- [test-api-validation.sh](./test-api-validation.sh) - API Test Scripts



