# Multiple Payments System for Duration Adjustments

## Overview

When a student's appointment duration is increased AFTER the initial payment has been made, a **second payment** is automatically created instead of modifying the existing payment record.

## Architecture

### Database Structure

```sql
-- payments table (unchanged schema)
-- Multiple payments can link to the SAME appointment_id

-- Example:
-- Appointment 1: 90 minutes
-- Payment 1 (original): CHF 190.00 | appointment_id = APT-123 | status = completed
-- 
-- Duration extended to 135 minutes
-- Payment 2 (adjustment): CHF 50.00 | appointment_id = APT-123 | status = pending_adjustment
```

### Payment Flow

1. **Initial Appointment Created**: `90 minutes` → `Payment 1: CHF 190` (paid)
2. **User Extends Duration**: `90min → 135min` in EventModal
3. **System Detects Paid Payment**: Calls `/api/appointments/update-duration-with-adjustment`
4. **Backend Creates Second Payment**:
   - `payment_method: "pending_adjustment"`
   - `payment_status: "pending"`
   - Links to same `appointment_id`
   - Stores metadata about the change
5. **Frontend Shows Notification**: "Zusätzliche Zahlung erforderlich: CHF 50.00"
6. **Customer Sees Both Payments**: 
   - Payments page shows Payment 1 + Payment 2
   - Both linked to the same appointment
   - Grouped chronologically

## API Changes

### `/api/appointments/update-duration-with-adjustment` (POST)

**Response for Duration Increase**:
```json
{
  "success": true,
  "message": "Appointment duration updated successfully",
  "oldDuration": 90,
  "newDuration": 135,
  "adjustment": {
    "type": "duration_increase",
    "amount": 5000,                    // Amount in Rappen (CHF 50.00)
    "oldPrice": 19000,                 // CHF 190
    "newPrice": 24000,                 // CHF 240
    "appliedToCredits": false,
    "secondPaymentId": "pay-456",     // NEW: Link to second payment
    "requiresPayment": true           // NEW: Flag for frontend
  }
}
```

## Frontend Implementation

### EventModal.vue

When duration changes on a paid appointment:

1. `handleDurationChanged()` is called
2. `checkAndPrepareForAdjustment()` queries payment status
3. If payment is `completed` or `authorized`:
   - Sets `needsAdjustmentEndpoint` flag
   - Shows warning to user
4. On save:
   - Calls `/api/appointments/update-duration-with-adjustment` endpoint
   - BYPASSES normal save flow
   - Shows success notification
   - Closes modal

### PriceDisplay.vue

- Displays existing payments in edit mode
- Shows payment method and status badges
- Can display multiple payments (not yet UI implemented, but data ready)

### Customer Payment Page

- Already shows all payments individually
- Each payment displays:
  - Status badge
  - Amount
  - Payment date (if completed)
  - Payment method
  - Associated appointment

**Multiple payments appear as separate rows** (same appointment_id visible in details)

## Payment Methods for Adjustments

When duration is **increased**:
- Second payment created with `payment_method: "pending_adjustment"`
- Student must pay the difference via payment page
- Can choose: Online (Wallee), Cash, Invoice

When duration is **decreased**:
- Credit applied directly to `student_credits` table
- No second payment needed
- Amount is added to student's available balance

## User Experience

### Scenario 1: Duration Reduced

```
Before: 90min @ CHF 2.11/min = CHF 189.90
After:  60min @ CHF 2.11/min = CHF 126.60

Difference: CHF 63.30 CREDIT

UI Flow:
1. User opens EventModal for appointment
2. Changes duration 90 → 60
3. Clicks Save
4. System shows: "Gutschrift erhalten: CHF 63.30"
5. Payment page shows: Credit added to student_credits balance
6. No second payment created
```

### Scenario 2: Duration Increased

```
Before: 90min @ CHF 2.11/min = CHF 189.90 (PAID)
After:  135min @ CHF 2.11/min = CHF 284.85

Difference: CHF 94.95 CHARGE

UI Flow:
1. User opens EventModal for appointment
2. Changes duration 90 → 135
3. Clicks Save
4. System detects paid payment
5. Creates Payment 2: CHF 94.95 (pending_adjustment)
6. Shows: "Zusätzliche Zahlung erforderlich: CHF 94.95"
7. User navigates to Payments page
8. Sees BOTH payments:
   - Payment 1: CHF 189.90 (completed) - original 90min
   - Payment 2: CHF 94.95 (pending) - additional 45min
9. Can pay Payment 2 via preferred method
```

## Data Display

### Payment History Query

```sql
SELECT * FROM payments
WHERE appointment_id = 'APT-123'
ORDER BY created_at ASC

-- Returns:
-- 1. Payment (original, 90min, CHF 190, completed)
-- 2. Payment (adjustment, 45min, CHF 95, pending_adjustment)
```

### Appointment Details View

Shows all linked payments with:
- Sequential order by `created_at`
- Status indicators
- Payment methods
- Amounts
- Balance information

## Implementation Checklist

- [x] Backend: Detect paid payments in update-duration endpoint
- [x] Backend: Calculate price difference for increased duration
- [x] Backend: Create second payment record
- [x] Backend: Store adjustment metadata
- [x] Frontend: Check payment status on duration change
- [x] Frontend: Show notification for second payment
- [x] Frontend: Pass secondPaymentId in response
- [ ] Frontend: Payment page grouping (optional - already shows all)
- [ ] Frontend: Add visual indicator "Duration adjusted" on payments
- [ ] Email: Send notification about second payment requirement
- [ ] Email: Include payment link for easy access

## Testing Scenarios

### Test 1: Increase Duration (Paid Appointment)
```
1. Create appointment: 90min
2. Pay in full (CHF 190, completed)
3. Edit appointment: Change to 120min
4. Expected: Second payment CHF 71.20 created (pending)
5. Verify: Both payments visible in payment history
6. Verify: Student can pay second payment
```

### Test 2: Decrease Duration (Paid Appointment)
```
1. Create appointment: 90min
2. Pay in full (CHF 190, completed)
3. Edit appointment: Change to 60min
4. Expected: Credit CHF 63.30 applied to student_credits
5. Verify: No second payment created
6. Verify: Student balance increased
```

### Test 3: Unpaid Appointment Duration Change
```
1. Create appointment: 90min (unpaid)
2. Edit appointment: Change to 120min
3. Expected: Payment updated directly (no second payment)
4. Verify: Single payment record with new amount
```

### Test 4: Multiple Duration Changes
```
1. Create appointment: 90min
2. Pay in full (CHF 190, completed)
3. Edit: Change to 120min → Second payment CHF 71
4. Edit: Change back to 90min → Credit applied
5. Expected: 3+ payment records in history showing full audit trail
```

## Edge Cases

### Case 1: Payment Already Partially Paid
- If payment status is `authorized` but not yet `completed`
- Still create second payment (cost is immediately due)

### Case 2: Zero Difference
- If new duration = old duration
- Don't create payment, just update appointment

### Case 3: Duration Decrease Below Threshold
- If credit exceeds lesson price (duration → 1min)
- Still apply full credit (prevents negative balance initially)

### Case 4: Concurrent Edits
- If payment is modified while duration change pending
- Use transaction lock to prevent inconsistency

## Email Notifications

When second payment is created:

```
Subject: Zusätzliche Zahlung erforderlich - Terminverlängerung

Body:
Ihr Termin wurde verlängert:
- Alte Dauer: 90 Minuten
- Neue Dauer: 135 Minuten
- Zusätzliche Gebühr: CHF 94.95

Bitte begleichen Sie die zusätzliche Zahlung hier:
[Link to payment page with second payment highlighted]
```

When credit is applied:

```
Subject: Gutschrift erhalten - Terminkürzung

Body:
Ihr Termin wurde verkürzt:
- Alte Dauer: 90 Minuten
- Neue Dauer: 60 Minuten
- Gutschrift: CHF 63.30

Der Betrag wurde Ihrem Kundenkonto gutgeschrieben.
```

## Future Enhancements

1. **Automatic Payment Processing**: If student has saved payment method, automatically charge second payment
2. **Bulk Duration Updates**: Handle multiple appointments at once
3. **Payment Bundling**: Option to bundle multiple pending payments into single transaction
4. **Credit Balance Integration**: Option to deduct from student credits instead of creating payment
5. **Analytics**: Track duration adjustment trends and revenue impact

