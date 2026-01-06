# Credit, Voucher & Discount Architecture - Secure & Flexible Design

## Current State Analysis

### Existing Tables
1. **student_credits** - Student balance tracking
2. **vouchers** - Gift card/voucher codes (created but not fully integrated)
3. **discount_sales** - Manual discounts (applied via frontend)
4. **credit_transactions** - Audit trail for credit usage
5. **payments** - Payment records with `credit_used_rappen` field

### Current Issues
1. **Discounts calculated in frontend** - Not validated server-side (security risk)
2. **Admin credit recharge** - No API for admins to add credit
3. **Vouchers not integrated** - Table exists but not used in payment flow
4. **No coupon system** - Can't redeem codes for discounts/credit
5. **No subscription/package system** - For recurring credit packages
6. **No promo codes** - Time-limited or usage-limited promotions

---

## Proposed Architecture

### 1. Credit Management System

#### Tables
```sql
-- Existing: student_credits (balance_rappen)
-- Existing: credit_transactions (audit trail)

-- NEW: credit_packages (predefined packages)
CREATE TABLE credit_packages (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  name VARCHAR(255),           -- "50 CHF Package", "100 CHF Package"
  description TEXT,
  amount_rappen INTEGER,        -- 5000, 10000, etc.
  price_rappen INTEGER,         -- Price to purchase
  bonus_rappen INTEGER,         -- Bonus credit (e.g., "Buy 100 get 20 free")
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- NEW: admin_credit_adjustments (audit trail for admin actions)
CREATE TABLE admin_credit_adjustments (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES users(id),
  adjusted_by UUID REFERENCES users(id),  -- Admin who made adjustment
  adjustment_rappen INTEGER,                -- Positive (add) or negative (remove)
  reason VARCHAR(255),                      -- "Manual adjustment", "Promo", etc.
  reference_type VARCHAR(50),               -- "manual", "promo", "refund", "compensation"
  reference_id UUID,                        -- Links to promo, refund, etc.
  balance_before_rappen INTEGER,
  balance_after_rappen INTEGER,
  tenant_id UUID,
  created_at TIMESTAMPTZ
);
```

#### API Endpoints (SECURE)
```typescript
// Admin adds credit to student
POST /api/admin/credit/adjust
Body: {
  studentId: UUID,
  amountRappen: number,
  reason: "manual_adjustment" | "promo" | "refund" | "compensation",
  referenceId?: UUID
}
// Requires: admin role, rate limiting, audit logging

// Student views credit transactions
GET /api/customer/credit/transactions
Response: [{ adjustmentRappen, reason, createdAt, ... }]

// Admin views all credit adjustments
GET /api/admin/credit/adjustments?studentId=...&tenantId=...
```

---

### 2. Voucher/Coupon System

#### Tables
```sql
-- Existing: vouchers (gift cards - for selling)

-- NEW: coupon_codes (discount codes)
CREATE TABLE coupon_codes (
  id UUID PRIMARY KEY,
  tenant_id UUID,
  code VARCHAR(50) UNIQUE,              -- "SUMMER20", "FIRST10"
  discount_type "percentage" | "fixed",
  discount_value NUMERIC,               -- 20 (for 20%) or 1000 (for 10 CHF)
  applicable_to "all" | "lessons" | "packages",  -- What can use this
  max_usage INTEGER,                     -- Total redemptions allowed
  max_usage_per_user INTEGER,           -- Per student
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- NEW: coupon_redemptions (audit trail)
CREATE TABLE coupon_redemptions (
  id UUID PRIMARY KEY,
  coupon_id UUID REFERENCES coupon_codes(id),
  user_id UUID REFERENCES users(id),
  appointment_id UUID REFERENCES appointments(id),
  discount_amount_rappen INTEGER,
  created_at TIMESTAMPTZ
);
```

#### API Endpoints (SECURE)
```typescript
// Validate & apply coupon code
POST /api/payments/validate-coupon
Body: {
  code: string,
  appointmentId: UUID,
  totalAmountRappen: number
}
Response: {
  valid: boolean,
  discountAmountRappen: number,
  finalAmountRappen: number,
  remainingUses: number,
  expiresAt: ISO string
}
// Requires: rate limiting, validation, audit logging
// Returns: validated discount OR error
// Backend applies discount, not frontend!

// Admin creates coupon
POST /api/admin/coupon/create
Body: { code, discountType, discountValue, validFrom, validUntil, ... }
```

---

### 3. Price Calculation Flow (SECURE)

#### Current Flow (UNSAFE)
```
Frontend:
1. Calculate base_price
2. Calculate admin_fee
3. Calculate products_total
4. Calculate discount (from frontend) ❌ NOT VALIDATED
5. Send to backend as totalAmountRappenForPayment
6. Backend blindly uses this value
```

#### Proposed Flow (SECURE)
```
Frontend:
1. Calculate components (base_price, admin_fee, products_total)
2. Send to backend BEFORE applying discount/credit

Backend (/api/prices/calculate-with-discounts):
1. Validate all components
2. Validate coupon code (if provided)
3. Calculate final price with:
   - Base price
   - Admin fee
   - Products total
   - Coupon discount (if valid)
   - Subscription discount (if applicable)
4. Return validated price breakdown
5. Create "pending quote" for 5 minutes (rate limit abuse)

Frontend:
1. Use calculated price from backend
2. Apply student credit locally (display only)
3. Send everything to create appointment

Backend (/api/appointments/save):
1. Validate price matches quote
2. Apply credit (if present)
3. Create payment record
4. Mark as 'completed' if fully covered
```

---

### 4. Implementation Priority

#### Phase 1 (Week 1) - CRITICAL
- [ ] API: `/api/payments/validate-coupon` (coupon validation)
- [ ] API: `/api/admin/credit/adjust` (admin recharge)
- [ ] API: `/api/prices/calculate-with-discounts` (server-side price calculation)
- [ ] Frontend: Update price calculation to use backend API
- [ ] Create pending_quotes table (for fraud prevention)

#### Phase 2 (Week 2)  
- [ ] Create coupon_codes & coupon_redemptions tables
- [ ] Admin UI: Create/manage coupons
- [ ] Admin UI: Manual credit adjustments
- [ ] Add bonus credit logic to packages
- [ ] Audit logging for all credit operations

#### Phase 3 (Week 3)
- [ ] Subscription packages (monthly auto-credit)
- [ ] Promo campaigns (bulk coupon generation)
- [ ] Credit expiration policies
- [ ] Withdrawal/refund management

---

### 5. Rate Limiting & Fraud Prevention

```typescript
// Pending quote (prevents replay attacks)
POST /api/prices/calculate-with-discounts
Response: {
  quoteId: UUID,
  totalAmountRappen: number,
  expiresAt: ISO_STRING (5 minutes)
}

// When creating appointment, quote_id must match
POST /api/appointments/save
Body: {
  ...
  quoteId: UUID,  // Must match pending quote
}
// Backend verifies: quote not expired, amount matches

// Coupon rate limiting
- Max 5 coupon validations per minute per user
- Max 10 redemptions per coupon code per day per user
```

---

### 6. Database Integrity

```sql
-- Ensure credit_transactions audit trail
ALTER TABLE credit_transactions ADD CHECK (
  (transaction_type IN ('appointment', 'refund', 'manual', 'promo'))
);

-- Ensure admin adjustments reference valid reasons
ALTER TABLE admin_credit_adjustments ADD CHECK (
  reference_type IN ('manual', 'promo', 'refund', 'compensation')
);

-- Unique constraint: one coupon redemption per appointment per coupon
ALTER TABLE coupon_redemptions ADD UNIQUE (coupon_id, appointment_id);
```

---

### 7. RLS Policies

```sql
-- Students can view their own credit adjustments
-- Admins can view all adjustments in their tenant
-- Staff can create adjustments (with approval flow optional)
-- Service role can create/read/update all (for APIs)
```

---

## Summary

| Aspect | Current | Proposed |
|--------|---------|----------|
| **Discounts** | Frontend calc ❌ | Server-side calc ✅ |
| **Admin credit** | No API ❌ | `/api/admin/credit/adjust` ✅ |
| **Coupons** | None ❌ | Full coupon system ✅ |
| **Vouchers** | Table only ❌ | Integrated in checkout ✅ |
| **Security** | Low ❌ | High (all server-side) ✅ |
| **Auditability** | Partial ❌ | Full trails ✅ |
| **Flexibility** | Hardcoded ❌ | Dynamic packages ✅ |

---

## Next Steps

1. **Start Phase 1** - Immediate security fix
2. **Create APIs first** - Secure price calculation & validation
3. **Update frontend** - Use backend for all calculations
4. **Add tables** - Coupon codes, redemptions, adjustments
5. **Test thoroughly** - Fraud scenarios, edge cases


