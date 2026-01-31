# useEventModalForm.ts - REFINED MIGRATION PLAN

## ✅ ENDPOINTS THAT ALREADY EXIST

```
✅ /api/appointments/save.post.ts - saves appointment
✅ /api/appointments/confirm.post.ts - confirms appointment  
✅ /api/appointments/confirm-with-payment.post.ts
✅ /api/appointments/cancel-staff.post.ts
✅ /api/appointments/cancel-customer.post.ts
✅ /api/appointments/handle-cancellation.post.ts
✅ /api/appointments/resend-confirmation.post.ts
✅ /api/appointments/adjust-duration.post.ts
✅ /api/appointments/update-payment-status.post.ts
```

## ❌ ENDPOINTS THAT ARE MISSING (NEED TO CREATE)

### TIER 1: CRITICAL (Direct queries in save flow)

1. **GET /api/appointments/get-payment** - Line 1053
   - Get existing payment for appointment
   - Used when updating products price
   - Currently: Direct supabase query

2. **POST /api/payments/update-payment** - Line 1080
   - Update payment with products price
   - Currently: Direct supabase query
   - **OR**: Consolidate into `/api/appointments/save` if possible

3. **GET /api/addresses/get-by-user** - Line 419
   - Get billing address for student
   - Used in form loading
   - Currently: Direct supabase query

### TIER 2: AVAILABILITY & LOCATION

4. **GET /api/appointments/check-availability** - Line 1182
   - Check staff availability
   - Currently: Direct query with complex filters

5. **GET /api/appointments/get-last-location** - Line 1680
   - Get staff's last used location
   - Currently: Direct query

### TIER 3: DISCOUNT & PRODUCTS

6. **GET /api/discounts/check-existing** - Line 506
   - Check if discount exists
   - Currently: Direct query

7. **POST /api/discounts/save-discount** - Lines 535, 547
   - Save/update discount
   - Currently: Direct insert/update

8. **GET /api/appointments/get-products** - Line 624
   - Get products for appointment
   - Currently: Direct select with relation

9. **POST /api/appointments/save-products** - Line 757
   - Save product items
   - Currently: Direct insert

10. **DELETE /api/appointments/delete-products** - Line 735
    - Delete existing products
    - Currently: Direct delete

### TIER 4: UTILITIES

11. **GET /api/appointments/get-next-number** - Line 1155
    - Get next appointment number
    - Currently: Direct count query

12. **GET /api/appointments/get-invited-customers** - Line 684
    - Get invited customers for appointment
    - Currently: Direct query

---

## 🎯 MIGRATION STRATEGY

### Phase 1: Check Existing Endpoints (DONE)
✅ Identified which endpoints exist
❌ Identified 12 missing endpoints

### Phase 2: Create Missing Endpoints (THIS PHASE)

**Start with**: TIER 1 (3 endpoints - highest impact)

1. `/api/appointments/get-payment.get.ts`
2. `/api/addresses/get-by-user.get.ts`
3. (Consolidate payment update into `/api/appointments/save` if possible)

Then: TIER 2, 3, 4

### Phase 3: Migrate Composable Functions
Replace each direct query with API call following REFACTORING_BLUEPRINT pattern

### Phase 4: Comprehensive Testing
Test full appointment lifecycle

---

## 📋 WHICH QUERIES CAN BE CONSOLIDATED?

Looking at the code, some operations are **ALREADY HANDLED by existing endpoints**:

### ✅ ALREADY DONE (via existing endpoints)
- Saving appointment → `/api/appointments/save` ✅
- Payment creation → Handled in `/api/appointments/save` ✅
- Staff auto-assign → Uses `/api/admin/update-user-assigned-staff` ✅

### ⚠️ PARTIALLY DONE (need enhancement)
- Discount save → Needs endpoint
- Products save → Needs endpoint
- Products delete → Needs endpoint

### ❌ NOT DONE (direct queries remain)
- Get billing address → Needs endpoint
- Get existing payment → Needs endpoint
- Check availability → Needs endpoint
- Get last location → Needs endpoint
- Get products list → Needs endpoint
- Check existing discount → Needs endpoint
- Get next number → Needs endpoint
- Get invited customers → Needs endpoint

---

## 🚀 IMMEDIATE ACTION ITEMS

### Step 1: CREATE CRITICAL ENDPOINTS (45-60 minutes)
Focusing on the ones used in saveAppointment() flow:

**Start with**:
```bash
server/api/appointments/get-payment.get.ts
server/api/addresses/get-by-user.get.ts
```

Then if products flow needs it:
```bash
server/api/appointments/get-products.get.ts
server/api/appointments/save-products.post.ts
server/api/appointments/delete-products.post.ts
```

### Step 2: MIGRATE COMPOSABLE FUNCTIONS (60-90 minutes)
Replace queries with API calls

### Step 3: TEST (45-60 minutes)
Full appointment lifecycle testing

---

## 🔍 DEEP ANALYSIS: What's ACTUALLY needed?

Looking at the `saveAppointment()` function, the **ONLY direct queries are**:

1. **Line 1053**: Get payment (to update it with products price)
2. **Line 1080**: Update payment (products price)

**Everything else in saveAppointment:**
- ✅ Uses existing `/api/appointments/save` endpoint
- ✅ Uses `/api/admin/update-user-assigned-staff` endpoint

So for saveAppointment flow, we only need:
- `/api/appointments/get-payment.get.ts` 
- (Can consolidate update into existing `/api/appointments/save`?)

**Other functions that have direct queries:**
- `loadStudentBillingAddress()` → needs endpoint
- `loadExistingPayment()` → already partially done (has API fallback)
- Various utility functions → need endpoints

---

## REVISED PRIORITY LIST

### CRITICAL PATH (affects saveAppointment)
1. Get Payment endpoint
2. Maybe enhance save endpoint to handle products price update

### HIGH PRIORITY (used in form)
3. Get billing address
4. Check availability
5. Get last location

### MEDIUM PRIORITY (discount/product management)
6. Check existing discount
7. Save discount
8. Get products
9. Save products
10. Delete products
11. Get next number
12. Get invited customers

---

**RECOMMENDATION**: 

Start by analyzing the **direct queries in saveAppointment()** more deeply.
Maybe we can consolidate the products price update INTO the existing `/api/appointments/save` endpoint to avoid needing more endpoints.

Then tackle the other functions.

Ready to dive in?
