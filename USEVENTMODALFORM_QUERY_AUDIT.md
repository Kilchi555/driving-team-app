# useEventModalForm.ts - COMPLETE QUERY AUDIT

## File Stats
- **Total Lines**: 1,766
- **Direct Supabase Queries**: 20 instances
- **Functions with Queries**: 11 functions
- **Risk Level**: 🔴 CRITICAL (Central to appointment system)

---

## 🔍 QUERY INVENTORY BY FUNCTION

### 1. loadStudentBillingAddress() - Line 410
**Type**: SELECT  
**Table**: company_billing_addresses  
**Query**:
```typescript
supabaseClient.from('company_billing_addresses')
  .select('*')
  .eq('user_id', studentId)
  .eq('is_active', true)
  .order('created_at', { ascending: false })
  .limit(1)
```
**Issue**: Direct query, no tenant validation  
**Status**: ❌ NEEDS MIGRATION  
**New Endpoint**: `/api/addresses/get-by-user`

---

### 2. loadExistingPayment() - Line 447
**Type**: SELECT  
**Table**: payments  
**Query**:
```typescript
const { data: existingPayment, error: fetchError } = await supabase
  .from('payments')
  .select('*')
  .eq('appointment_id', appointmentId)
  .single()
```
**Issue**: Direct query, no tenant validation  
**Status**: ❌ NEEDS MIGRATION (Also has API fallback)  
**New Endpoint**: `/api/appointments/get-payment` (enhance existing)

---

### 3. checkExistingDiscount() - Line 506
**Type**: SELECT  
**Table**: discount_sales  
**Query**:
```typescript
const { data: existingDiscount, error: checkError } = await supabase
  .from('discount_sales')
  .select('id')
  .eq('appointment_id', appointmentId)
  .single()
```
**Issue**: Direct query  
**Status**: ❌ NEEDS MIGRATION  
**New Endpoint**: `/api/discounts/check-existing`

---

### 4. saveDiscount() - Lines 535, 547
**Type**: UPDATE + INSERT  
**Table**: discount_sales  
**Queries**:
```typescript
// UPDATE
await supabase
  .from('discount_sales')
  .update(discountData)
  .eq('id', existingDiscount.id)
  .select()
  .single()

// INSERT
await supabase
  .from('discount_sales')
  .insert(discountData)
  .select()
  .single()
```
**Issue**: Direct writes, no transaction safety  
**Status**: ❌ NEEDS MIGRATION  
**New Endpoint**: `/api/discounts/save-discount`

---

### 5. loadProductItems() - Line 624
**Type**: SELECT (with relation)  
**Table**: product_sales + products  
**Query**:
```typescript
const { data: productItems, error } = await supabase
  .from('product_sales')
  .select(`
    *,
    products (
      id,
      name,
      description,
      ...
    )
  `)
  .eq('appointment_id', appointmentId)
```
**Issue**: Complex select with relations, no validation  
**Status**: ❌ NEEDS MIGRATION  
**New Endpoint**: `/api/appointments/get-products`

---

### 6. loadInvitedCustomers() - Line 684
**Type**: SELECT  
**Table**: invited_customers  
**Query**:
```typescript
const { data: customers, error: customersError } = await supabase
  .from('invited_customers')
  .select('*')
  .eq('appointment_id', appointmentId)
```
**Issue**: Direct query  
**Status**: ❌ NEEDS MIGRATION  
**New Endpoint**: `/api/appointments/get-invited-customers`

---

### 7. deleteExistingProducts() - Line 735
**Type**: DELETE  
**Table**: product_sales  
**Query**:
```typescript
const { error: deleteError } = await supabase
  .from('product_sales')
  .delete()
  .eq('appointment_id', appointmentId)
```
**Issue**: Direct delete, dangerous without validation  
**Status**: ❌ NEEDS MIGRATION  
**New Endpoint**: `/api/appointments/delete-products`

---

### 8. saveProductItems() - Line 757
**Type**: INSERT  
**Table**: product_sales  
**Query**:
```typescript
const { error: insertError } = await supabase
  .from('product_sales')
  .insert(productData)
```
**Issue**: Direct insert  
**Status**: ❌ NEEDS MIGRATION  
**New Endpoint**: `/api/appointments/save-products`

---

### 9. saveAppointment() - Lines 1053, 1080, 1130-1133
**Type**: SELECT + UPDATE + DELETE  
**Table**: payments, appointments  
**Queries**:
```typescript
// 1. SELECT payments
const { data: payments } = await supabase
  .from('payments')
  .select('id, total_amount_rappen, lesson_price_rappen, ...')
  .eq('appointment_id', result.id)
  .single()

// 2. UPDATE payments
await supabase
  .from('payments')
  .update(paymentUpdateData)
  .eq('appointment_id', result.id)

// 3. DELETE appointment
const { error } = await supabase
  .from('appointments')
  .delete()
  .eq('id', eventId)
```
**Issue**: Multiple direct operations, no transaction  
**Status**: ❌ NEEDS MIGRATION  
**New Endpoints**: 
- `/api/appointments/save-appointment` (consolidate)
- `/api/appointments/delete-appointment`

---

### 10. getNextAppointmentNumber() - Line 1155
**Type**: SELECT (count)  
**Table**: appointments  
**Query**:
```typescript
const { count, error } = await supabase
  .from('appointments')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', studentId)
  .in('status', ['completed', 'confirmed'])
```
**Issue**: Direct count query  
**Status**: ❌ NEEDS MIGRATION  
**New Endpoint**: `/api/appointments/get-next-number`

---

### 11. checkAvailability() - Lines 1182-1189
**Type**: SELECT  
**Table**: appointments  
**Query**:
```typescript
let query = supabase
  .from('appointments')
  .select('type, start_time, user_id, title')
  .eq('staff_id', currentUser.id)
  .is('deleted_at', null)
  .not('status', 'eq', 'cancelled')
  .not('status', 'eq', 'aborted')
  .order('start_time', { ascending: false })
```
**Issue**: Complex query, no tenant validation  
**Status**: ❌ NEEDS MIGRATION  
**New Endpoint**: `/api/appointments/check-availability`

---

### 12. updatePayment() - Lines 1528-1530, 1647-1652
**Type**: SELECT + UPDATE  
**Table**: pricing_rules, payments  
**Queries**:
```typescript
// 1. GET pricing rule
const { data: pricingRule } = await supabase
  .from('pricing_rules')
  .select('*')
  .eq('category_code', formData.value.type)
  .eq('tenant_id', staffTenantId)
  .eq('is_default', false)
  .order('created_at', { ascending: false })
  .limit(1)

// 2. UPDATE payment
const { data: payment } = await supabase
  .from('payments')
  .update(updateData)
  .eq('id', existingPayment.id)
  .select()
  .single()
```
**Issue**: Multiple direct operations  
**Status**: ❌ NEEDS MIGRATION  
**New Endpoint**: `/api/payments/update-payment`

---

### 13. getLastLocation() - Lines 1680-1687
**Type**: SELECT  
**Table**: appointments  
**Query**:
```typescript
let query = supabase
  .from('appointments')
  .select('location_id, custom_location_address, start_time, user_id, title')
  .eq('staff_id', currentUser.id)
  .order('start_time', { ascending: false })
```
**Issue**: Direct query  
**Status**: ❌ NEEDS MIGRATION  
**New Endpoint**: `/api/appointments/get-last-location`

---

## 📊 QUERY SUMMARY

| Type | Count | Status |
|------|-------|--------|
| SELECT | 10 | ❌ 10 to migrate |
| INSERT | 2 | ❌ 2 to migrate |
| UPDATE | 4 | ❌ 4 to migrate |
| DELETE | 2 | ❌ 2 to migrate |
| **TOTAL** | **18** | **❌ ALL NEED MIGRATION** |

---

## 🎯 REQUIRED API ENDPOINTS (8 Major)

### PRIORITY 1 - CRITICAL PATH
1. `/api/appointments/save-appointment` - **BIGGEST** (consolidates save logic)
2. `/api/appointments/delete-appointment`
3. `/api/payments/update-payment`

### PRIORITY 2 - SUPPORTING
4. `/api/addresses/get-by-user`
5. `/api/appointments/get-payment`
6. `/api/appointments/check-availability`

### PRIORITY 3 - PRODUCT MANAGEMENT
7. `/api/appointments/get-products`
8. `/api/appointments/save-products`
9. `/api/appointments/delete-products`

### PRIORITY 4 - UTILITIES
10. `/api/discounts/check-existing`
11. `/api/discounts/save-discount`
12. `/api/appointments/get-invited-customers`
13. `/api/appointments/get-next-number`
14. `/api/appointments/get-last-location`

---

## 🚀 REFACTORING STRATEGY

### Phase 1: Create Core Endpoints (1.5-2 hours)
- `/api/appointments/save-appointment`
- `/api/appointments/delete-appointment`
- `/api/payments/update-payment`

### Phase 2: Migrate Core Functions (1 hour)
- `saveAppointment()`
- `deleteAppointment()`
- `updatePayment()`

### Phase 3: Create Support Endpoints (1 hour)
- Address, availability, payment queries
- Simple one-to-one migrations

### Phase 4: Create Remaining Endpoints + Migrate (1 hour)
- Discount, product, utility endpoints
- Final cleanups

### Phase 5: Comprehensive Testing (45 mins)
- Form loading
- Appointment creation
- Appointment editing
- Appointment deletion
- Payment calculations
- Product management

---

## ⏱️ TOTAL ESTIMATED TIME
- Endpoints: 3-3.5 hours
- Function Migration: 1-1.5 hours
- Testing: 45 mins - 1 hour
- **TOTAL: 5-6 hours** (more thorough than original 3-4 estimate)

---

## ⚠️ CRITICAL CONSIDERATIONS

1. **Transaction Safety**
   - Current code lacks transactions
   - saveAppointment does multiple DB operations
   - Need atomic transactions on backend

2. **Payment Calculations**
   - Complex pricing logic
   - Multiple related records
   - Must maintain data consistency

3. **Dependencies**
   - Products depend on appointment
   - Payments depend on appointment
   - Discounts depend on appointment
   - Careful deletion order needed

4. **Testing Coverage Required**
   - Full appointment create-read-update-delete cycle
   - Payment calculations
   - Product associations
   - Discount validations

---

## ✅ NEXT STEP: START WITH PHASE 1

Ready to create the core endpoints?

**→ Shall I start creating `/api/appointments/save-appointment`?**
