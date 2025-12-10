# EventModal Duration Update Fix

## Problem

When a user changes the appointment duration in EventModal:
- ✅ If payment is **pending**: Update payment directly (currently working)
- ❌ If payment is **paid/completed**: Should use `update-duration-with-adjustment` endpoint for credit/charge logic
- ❌ If product is added/removed: Should create second payment for difference

## Solution

### 1. Import the helper utility

```typescript
import { handleAppointmentDurationUpdate, getAppointmentPaymentStatus } from '~/server/utils/handle-appointment-update'
```

### 2. In `handleDurationChanged()` function

Instead of directly updating formData, check if this is an edit mode with paid payment:

```typescript
const handleDurationChanged = (newDuration: number) => {
  logger.debug('⏱️ Duration changed to:', newDuration)
  
  if (isPastAppointment.value) {
    logger.debug('🚫 Cannot change duration for past appointment')
    return
  }
  
  // Store old duration for later use
  const oldDuration = formData.value.duration_minutes
  
  // Update form UI
  formData.value.duration_minutes = newDuration
  calculateEndTime()
  
  // ✅ NEW: If this is edit mode, handle payment adjustments
  if (props.mode === 'edit' && props.eventData?.id) {
    handlePaidAppointmentDurationChange(oldDuration, newDuration, props.eventData.id)
  }
}

// New helper function
const handlePaidAppointmentDurationChange = async (oldDuration: number, newDuration: number, appointmentId: string) => {
  try {
    // Check if payment exists and is paid
    const paymentStatus = await getAppointmentPaymentStatus(appointmentId)
    
    if (paymentStatus?.payment_status === 'completed' || paymentStatus?.payment_status === 'authorized') {
      // Payment is paid - show warning and prepare for adjustment
      logger.debug('⚠️ This appointment has a paid payment. Price adjustment will be handled automatically.')
      
      // Show message to user
      showNotification('info', 'Termin hat bezahlte Lektion', 'Die Preisanpassung wird automatisch verarbeitet.')
      
      // The actual adjustment will be handled when user saves
      // Store the fact that we need to call the adjustment endpoint
      needsAdjustmentEndpoint.value = {
        appointmentId,
        oldDuration,
        newDuration
      }
    }
  } catch (error) {
    logger.error('EventModal', 'Error checking payment status:', error)
  }
}
```

### 3. In `saveAppointment()` function

Before the normal appointment save, check if we need to use adjustment endpoint:

```typescript
const saveAppointment = async (mode: 'create' | 'edit', eventId?: string) => {
  // ... existing code ...
  
  // ✅ NEW: If duration changed on paid appointment, use adjustment endpoint
  if (mode === 'edit' && needsAdjustmentEndpoint.value) {
    try {
      logger.debug('📞 Calling update-duration-with-adjustment endpoint...')
      
      const adjustmentResult = await $fetch('/api/appointments/update-duration-with-adjustment', {
        method: 'POST',
        body: {
          appointmentId: needsAdjustmentEndpoint.value.appointmentId,
          newDurationMinutes: needsAdjustmentEndpoint.value.newDuration,
          reason: 'Duration adjusted in EventModal'
        }
      })
      
      logger.debug('✅ Adjustment completed:', adjustmentResult)
      
      // Clear the flag
      needsAdjustmentEndpoint.value = null
      
      // Don't continue with normal save - adjustment was already done
      if (adjustmentResult.success) {
        emit('refresh-calendar')
        emit('close')
        return
      }
    } catch (error: any) {
      logger.error('EventModal', 'Error calling adjustment endpoint:', error)
      // Fall through to normal save if adjustment fails
    }
  }
  
  // ... rest of existing save code ...
}
```

### 4. Add state variable

```typescript
const needsAdjustmentEndpoint = ref<{
  appointmentId: string
  oldDuration: number
  newDuration: number
} | null>(null)
```

## Expected Behavior After Fix

### Scenario 1: Duration reduced (90min → 60min), Payment Paid
1. User changes duration
2. ✅ Modal shows: "Lektion hat bezahlte Lektion - CHF 40 Gutschrift wird hinzugefügt"
3. User clicks Save
4. ✅ Backend calculates: CHF 120 → CHF 80 = CHF -40 credit
5. ✅ Credits updated: +CHF 40 on student_credits
6. ✅ Email sent to student: "Gutschrift erhalten - CHF 40.00"

### Scenario 2: Duration increased (45min → 90min), Payment Paid
1. User changes duration
2. ✅ Modal shows: "Lektion hat bezahlte Lektion - CHF 80 Aufpreis wird berechnet"
3. User clicks Save
4. ✅ Backend calculates: CHF 95 → CHF 190 = CHF +95 charge
5. ✅ Credits updated: -CHF 95 from student_credits (goes negative if not enough)
6. ✅ Email sent to student: "Terminverlängerung - CHF 95.00 Aufpreis"

### Scenario 3: Duration increased (45min → 90min), Payment Paid, Credits not enough
1. User changes duration
2. User clicks Save
3. ✅ Credits go negative: CHF 50 - CHF 95 = CHF -45 (debt)
4. ✅ UI shows: "⚠️ Offener Betrag CHF 45.00" (in red)
5. ✅ At next payment: Debt automatically included in calculation

### Scenario 4: Duration changed, Payment Pending
1. User changes duration
2. ✅ Payment is updated directly (no credit logic needed)
3. ✅ Normal save continues

## Files to Modify

1. **components/EventModal.vue**
   - Import utility
   - Add `needsAdjustmentEndpoint` state
   - Modify `handleDurationChanged()`
   - Modify `saveAppointment()`

2. **server/utils/handle-appointment-update.ts**
   - NEW FILE - already created

## Testing

- [ ] Reduce paid appointment duration → verify credit added
- [ ] Increase paid appointment duration → verify credit deducted
- [ ] Increase with insufficient credits → verify negative balance created
- [ ] Change pending payment duration → verify direct update
- [ ] Verify emails sent with correct amounts

