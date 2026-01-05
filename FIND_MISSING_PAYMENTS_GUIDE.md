# FIND APPOINTMENTS WITHOUT PAYMENTS - QUERY

## Quick Check - Run in Supabase SQL Editor

### 1. Find All Appointments Without Payments

```sql
-- Find appointments that have no corresponding payment
SELECT 
  a.id as appointment_id,
  a.title,
  a.type,
  a.user_id,
  a.created_at,
  a.status,
  COUNT(p.id) as payment_count
FROM appointments a
LEFT JOIN payments p ON a.id = p.appointment_id
WHERE p.id IS NULL  -- No payment found
GROUP BY a.id, a.title, a.type, a.user_id, a.created_at, a.status
ORDER BY a.created_at DESC
LIMIT 100;
```

**Result:** Shows all appointments without payments

---

### 2. Count by Status

```sql
-- How many appointments without payments, grouped by status
SELECT 
  a.status,
  COUNT(*) as appointment_count
FROM appointments a
LEFT JOIN payments p ON a.id = p.appointment_id
WHERE p.id IS NULL
GROUP BY a.status
ORDER BY appointment_count DESC;
```

---

### 3. Find Recently Created (Last 7 Days)

```sql
-- Appointments created in last 7 days without payments
SELECT 
  a.id,
  a.title,
  a.type,
  a.user_id,
  a.created_at,
  EXTRACT(DAY FROM NOW() - a.created_at) as days_ago
FROM appointments a
LEFT JOIN payments p ON a.id = p.appointment_id
WHERE p.id IS NULL
  AND a.created_at > NOW() - INTERVAL '7 days'
ORDER BY a.created_at DESC;
```

---

### 4. Get Details for Manual Creation

```sql
-- Detailed info needed to create payments manually
SELECT 
  a.id as appointment_id,
  a.user_id,
  a.tenant_id,
  a.title,
  a.type,
  a.duration_minutes,
  a.created_at,
  a.status,
  -- Calculate price (you'll need to adjust based on your pricing logic)
  CASE 
    WHEN a.type = 'B' THEN 9500  -- Example: CHF 95.00 in Rappen
    WHEN a.type = 'A' THEN 8000
    ELSE 10000
  END as estimated_amount_rappen
FROM appointments a
LEFT JOIN payments p ON a.id = p.appointment_id
WHERE p.id IS NULL
  AND a.created_at > NOW() - INTERVAL '7 days'
ORDER BY a.created_at DESC;
```

---

## If Appointments WITHOUT Payments Found

### Option 1: Create Payments Manually (SQL)

```sql
-- Create missing payments for recent appointments without payments
INSERT INTO payments (
  appointment_id,
  user_id,
  tenant_id,
  total_amount_rappen,
  payment_method,
  payment_status,
  description,
  created_at
)
SELECT 
  a.id,
  a.user_id,
  a.tenant_id,
  9500,  -- Adjust based on appointment type
  'wallee',
  'pending_confirmation',
  CONCAT('Fahrlektio ', a.type),
  NOW()
FROM appointments a
LEFT JOIN payments p ON a.id = p.appointment_id
WHERE p.id IS NULL
  AND a.created_at > NOW() - INTERVAL '7 days'
ON CONFLICT DO NOTHING;
```

---

### Option 2: Create Payments via API (Recommended)

Create a migration script that:
1. Finds all appointments without payments
2. For each appointment, calls a cleanup API endpoint
3. Creates the missing payment

**Script: `/api/admin/create-missing-payments.post.ts`**

```typescript
// server/api/admin/create-missing-payments.post.ts
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabaseAdmin()
    
    // Find all appointments without payments
    const { data: appointmentsWithoutPayments, error: fetchError } = await supabase
      .from('appointments')
      .select('id, user_id, tenant_id, type, duration_minutes, title, created_at')
      .left_join('payments', 'appointments.id', '=', 'payments.appointment_id')
      .is('payments.id', null)
      .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
    
    if (fetchError) throw fetchError
    
    logger.debug(`Found ${appointmentsWithoutPayments?.length || 0} appointments without payments`)
    
    let createdCount = 0
    let errorCount = 0
    
    for (const apt of appointmentsWithoutPayments || []) {
      try {
        // Estimate price based on type (adjust logic as needed)
        let totalAmountRappen = 9500 // Default CHF 95.00
        if (apt.type === 'A') totalAmountRappen = 8000
        if (apt.type === 'C') totalAmountRappen = 11000
        
        const { data: payment, error: insertError } = await supabase
          .from('payments')
          .insert({
            appointment_id: apt.id,
            user_id: apt.user_id,
            tenant_id: apt.tenant_id,
            total_amount_rappen: totalAmountRappen,
            payment_method: 'wallee',
            payment_status: 'pending_confirmation',
            description: apt.title || `Fahrlektio ${apt.type}`,
            created_at: apt.created_at
          })
          .select()
          .single()
        
        if (insertError) {
          logger.error(`Failed to create payment for appointment ${apt.id}:`, insertError)
          errorCount++
        } else {
          logger.debug(`Created payment for appointment ${apt.id}:`, payment.id)
          createdCount++
        }
      } catch (err: any) {
        logger.error(`Exception creating payment for ${apt.id}:`, err)
        errorCount++
      }
    }
    
    return {
      success: true,
      summary: {
        appointmentsWithoutPayments: appointmentsWithoutPayments?.length || 0,
        createdPayments: createdCount,
        failedPayments: errorCount
      }
    }
  } catch (error: any) {
    logger.error('Error in create-missing-payments:', error)
    throw createError({
      statusCode: 500,
      message: error.message
    })
  }
})
```

---

## Prevention for Future

### Check Before Saving

Add validation in `appointments/save.post.ts`:

```typescript
// If this is a new appointment and we have pricing data
if (!eventId && appointmentData.total_amount_rappen) {
  // Log that payment will be created
  logger.info('Will create payment for new appointment', {
    appointmentId: result.id,
    amount: appointmentData.total_amount_rappen
  })
  
  // Verify payment was created
  setTimeout(async () => {
    const { data: payment } = await supabase
      .from('payments')
      .select('id')
      .eq('appointment_id', result.id)
      .single()
    
    if (!payment) {
      logger.error('ALERT: Payment was not created for appointment!', result.id)
      // Send alert to admin
    }
  }, 1000)
}
```

---

## Summary

**Check for missing payments:**
```sql
SELECT COUNT(*) FROM appointments a
LEFT JOIN payments p ON a.id = p.appointment_id
WHERE p.id IS NULL;
```

**If found:**
- Use Option 1 (SQL) for quick fix
- Use Option 2 (API) for safer, auditable fix

**Prevent future:**
- Monitor payment creation
- Add validation checks
- Log warnings when payments aren't created

