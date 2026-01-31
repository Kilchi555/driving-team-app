# useEventModalForm.ts - MIGRATION CHECKLIST

## ✅ NEW ENDPOINTS CREATED

1. ✅ `/api/appointments/update-payment-with-products.post.ts` - Update payment after products
2. ✅ `/api/addresses/get-by-user.get.ts` - Get billing address
3. ✅ `/api/appointments/delete.post.ts` - Delete appointment
4. ✅ `/api/appointments/get-next-number.get.ts` - Get next appointment number
5. ✅ `/api/appointments/get-last-category.get.ts` - Get last appointment category
6. ✅ `/api/discounts/check-and-save.post.ts` - Check and save discount
7. ✅ `/api/appointments/manage-products.post.ts` - Manage products (get/save/delete)

---

## 🔄 FUNCTIONS THAT NEED MIGRATION

### Priority 1: Lines with direct Supabase queries in saveAppointment() - LINES 1053 & 1080

**Status**: These are in a non-critical block (only runs if products exist)
- Line 1049: `const supabase = getSupabase()` ← REMOVE
- Line 1050: `const { data: { session } } = await supabase.auth.getSession()` ← REMOVE
- Lines 1053-1057: `supabase.from('payments').select(...)` ← REPLACE with `/api/appointments/update-payment-with-products`
- Lines 1080-1083: `supabase.from('payments').update(...)` ← REPLACE with same endpoint

**Action**: Replace with single API call to `/api/appointments/update-payment-with-products`

---

### Priority 2: loadStudentBillingAddress() - Line 410

**Current**:
```typescript
const supabaseClient = getSupabase()
const { data: addressData, error: addressError } = await supabaseClient
  .from('company_billing_addresses')
  .select('*')
  .eq('user_id', studentId)
  .eq('is_active', true)
  .order('created_at', { ascending: false })
  .limit(1)
```

**New**:
```typescript
const response = await $fetch('/api/addresses/get-by-user', {
  query: { user_id: studentId }
})
const addressData = response?.data
```

**Remove**: `const supabaseClient = getSupabase()` import

---

### Priority 3: deleteAppointment() - Lines 1129-1133

**Current**:
```typescript
const supabase = getSupabase()
const { error } = await supabase
  .from('appointments')
  .delete()
  .eq('id', eventId)
```

**New**:
```typescript
const response = await $fetch('/api/appointments/delete', {
  method: 'POST',
  body: { appointmentId: eventId }
})
```

---

### Priority 4: getAppointmentNumber() - Lines 1155-1159

**Current**:
```typescript
const supabase = getSupabase()
const { count, error } = await supabase
  .from('appointments')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', studentId)
  .in('status', ['completed', 'confirmed'])
```

**New**:
```typescript
const response = await $fetch('/api/appointments/get-next-number', {
  query: { user_id: studentId }
})
const count = (response?.data?.number || 1) - 1
```

---

### Priority 5: loadLastAppointmentCategory() - Lines 1182-1196

**Current**:
```typescript
const supabase = getSupabase()
let query = supabase
  .from('appointments')
  .select('type, start_time, user_id, title')
  .eq('staff_id', currentUser.id)
  .is('deleted_at', null)
  .not('status', 'eq', 'cancelled')
  .not('status', 'eq', 'aborted')
  .order('start_time', { ascending: false })

if (studentId) {
  query = query.eq('user_id', studentId)
}

const { data: lastAppointment, error } = await query.limit(1).maybeSingle()
```

**New**:
```typescript
const response = await $fetch('/api/appointments/get-last-category', {
  query: { student_id: studentId }
})
const lastAppointment = response?.data
```

---

### Priority 6: saveDiscountOrCreateForProducts() - Lines 506-555

**Current** (complex logic with check, then insert OR update):
```typescript
const { data: existingDiscount } = await supabase.from('discount_sales')...
// ... logic to determine insert vs update ...
if (existingDiscount) {
  await supabase.from('discount_sales').update(...)
} else {
  await supabase.from('discount_sales').insert(...)
}
```

**New**:
```typescript
const response = await $fetch('/api/discounts/check-and-save', {
  method: 'POST',
  body: { 
    appointmentId: result.id,
    discountData: discountData
  }
})
const discountSale = response?.data
```

---

### Priority 7: loadProductItems() - Line 624

**Current**:
```typescript
const { data: productItems } = await supabase
  .from('product_sales')
  .select(`...`)
  .eq('appointment_id', appointmentId)
```

**New**:
```typescript
const response = await $fetch('/api/appointments/manage-products', {
  method: 'POST',
  body: {
    appointmentId,
    action: 'get'
  }
})
const productItems = response?.data || []
```

---

### Priority 8: deleteExistingProducts() - Line 735

**Current**:
```typescript
const { error: deleteError } = await supabase
  .from('product_sales')
  .delete()
  .eq('appointment_id', appointmentId)
```

**New**:
```typescript
await $fetch('/api/appointments/manage-products', {
  method: 'POST',
  body: {
    appointmentId,
    action: 'delete'
  }
})
```

---

### Priority 9: saveProductItems() - Line 757

**Current**:
```typescript
const { error: insertError } = await supabase
  .from('product_sales')
  .insert(productData)
```

**New**:
```typescript
const response = await $fetch('/api/appointments/manage-products', {
  method: 'POST',
  body: {
    appointmentId,
    action: 'save',
    productData
  }
})
```

---

### Priority 10: loadInvitedCustomers() - Line 684

**Status**: LOW PRIORITY - Doesn't seem critical, rarely used

Lass mich erst checken ob das tatsächlich genutzt wird...

---

## 🎯 MIGRATION ORDER (Recommended)

### Phase 1: saveAppointment() Core (Lines 1053, 1080) - 10 mins
- Create single API call for payment products update
- This is NON-CRITICAL (only runs if products)

### Phase 2: Utility Functions (10-15 mins)
- deleteAppointment()
- getAppointmentNumber()
- loadLastAppointmentCategory()

### Phase 3: Discount & Products (15-20 mins)
- saveDiscountOrCreateForProducts()
- loadProductItems()
- deleteExistingProducts()
- saveProductItems()

### Phase 4: Address & Other (10 mins)
- loadStudentBillingAddress()
- loadInvitedCustomers() - if needed
- loadExistingPayment() - check if still has direct queries

### Phase 5: Test & Cleanup (20-30 mins)
- Remove all `getSupabase()` imports
- Test full appointment flow
- Commit

---

## ✅ TOTAL MIGRATION TIME ESTIMATE

- Phase 1: 10 mins
- Phase 2: 15 mins
- Phase 3: 20 mins
- Phase 4: 10 mins
- Phase 5: 30 mins
**TOTAL: ~1.5-2 hours** (much faster than expected!)

---

## 🚀 READY TO START?

Shall I start with **Phase 1: Lines 1053 & 1080 in saveAppointment()?**

This is the quickest win and will eliminate direct queries from the critical save path.
