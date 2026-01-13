# WEBHOOK ROLLBACK + CREDIT TRANSACTIONS - IMPLEMENTATION

**Datum:** 2026-01-12  
**Status:** ✅ Implementiert & Deployed  
**Commits:** `847481c` (Credit Integration) + `254f69c` (Transactions & Rollback)

---

## 🎯 PROBLEM GELÖST

### Problem 1: Credit Transactions fehlten

**Vorher:**
```
❌ Credit wurde abgezogen
❌ Keine Einträge in credit_transactions
❌ Customer konnte Verlauf nicht sehen
❌ Keine Audit Trail
```

**Jetzt:**
```
✅ Jede Credit-Operation erstellt Transaction
✅ Vollständiger Verlauf sichtbar
✅ Balance before/after aufgezeichnet
✅ Audit Trail vorhanden
```

### Problem 2: Credit verloren bei Wallee-Fehler

**Vorher:**
```
Scenario: Partial Credit Payment
1. Customer: 100 CHF Payment, 40 CHF Credit
2. API zieht 40 CHF ab
3. Wallee: Customer bricht ab
4. Result: ❌ 40 CHF verloren!
```

**Jetzt:**
```
Scenario: Partial Credit Payment mit Rollback
1. Customer: 100 CHF Payment, 40 CHF Credit
2. API zieht 40 CHF ab
3. Wallee: Customer bricht ab
4. Webhook: Erkennt Failed payment
5. Rollback: ✅ 40 CHF zurückerstattet
6. Transaction: ✅ Refund dokumentiert
7. Result: ✅ Credit wieder da!
```

---

## 📋 IMPLEMENTIERUNG

### **A) Process Payment API** (`/api/payments/process.post.ts`)

**Layer 9: Full Credit Coverage**

```typescript
// Deduct credit
const newBalance = availableCredit - creditToDeduct
await supabaseAdmin
  .from('student_credits')
  .update({ balance_rappen: newBalance })
  .eq('user_id', userData.id)

// ✅ Create credit_transaction
await supabaseAdmin
  .from('credit_transactions')
  .insert({
    user_id: userData.id,
    tenant_id: tenantId,
    transaction_type: 'payment',
    amount_rappen: -creditToDeduct, // Negative = deduction
    balance_before_rappen: availableCredit,
    balance_after_rappen: newBalance,
    payment_method: 'credit',
    reference_id: payment.id,
    reference_type: 'payment',
    notes: `Guthaben für Zahlung verwendet (Payment ID: ${payment.id})`,
    status: 'completed'
  })
```

### **B) Webhook Handler** (`/api/wallee/webhook.post.ts`)

**handleCreditRefund() - Bei Failed/Cancelled Payments:**

```typescript
async function handleCreditRefund(payments: any[]) {
  for (const payment of payments) {
    const pendingRefund = payment.metadata?.pending_credit_refund
    
    if (pendingRefund > 0) {
      // 1. Get current balance
      const { data: creditData } = await supabase
        .from('student_credits')
        .select('balance_rappen')
        .eq('user_id', payment.user_id)
        .single()
      
      const balanceBefore = creditData.balance_rappen
      const newBalance = balanceBefore + pendingRefund // Add back!
      
      // 2. Refund credit
      await supabase
        .from('student_credits')
        .update({ balance_rappen: newBalance })
        .eq('user_id', payment.user_id)
      
      // 3. ✅ Create refund transaction
      await supabase
        .from('credit_transactions')
        .insert({
          user_id: payment.user_id,
          tenant_id: payment.tenant_id,
          transaction_type: 'refund',
          amount_rappen: pendingRefund, // Positive = addition
          balance_before_rappen: balanceBefore,
          balance_after_rappen: newBalance,
          payment_method: 'wallee_failed',
          reference_id: payment.id,
          reference_type: 'payment',
          notes: `Rückerstattung wegen fehlgeschlagener Wallee-Zahlung`,
          status: 'completed'
        })
      
      // 4. Clear pending refund
      await supabase
        .from('payments')
        .update({
          metadata: {
            ...payment.metadata,
            pending_credit_refund: null,
            credit_refunded: true,
            credit_refunded_at: new Date()
          }
        })
    }
  }
}
```

**confirmCreditDeduction() - Bei Successful Payments:**

```typescript
async function confirmCreditDeduction(payments: any[]) {
  for (const payment of payments) {
    const creditUsed = payment.credit_used_rappen
    
    if (creditUsed > 0) {
      // Get current balance
      const { data: creditData } = await supabase
        .from('student_credits')
        .select('balance_rappen')
        .eq('user_id', payment.user_id)
        .single()
      
      const currentBalance = creditData.balance_rappen
      const balanceBefore = currentBalance + creditUsed // Reconstruct
      
      // ✅ Create payment transaction
      await supabase
        .from('credit_transactions')
        .insert({
          user_id: payment.user_id,
          tenant_id: payment.tenant_id,
          transaction_type: 'payment',
          amount_rappen: -creditUsed, // Negative = deduction
          balance_before_rappen: balanceBefore,
          balance_after_rappen: currentBalance,
          payment_method: 'credit',
          reference_id: payment.id,
          reference_type: 'payment',
          notes: `Guthaben für Zahlung verwendet (Payment ID: ${payment.id})`,
          status: 'completed'
        })
      
      // Clear pending_credit_refund
      await supabase
        .from('payments')
        .update({
          metadata: {
            ...payment.metadata,
            pending_credit_refund: null,
            credit_confirmed_at: new Date()
          }
        })
    }
  }
}
```

---

## 🔄 CREDIT TRANSACTION FLOWS

### **Flow 1: Full Credit Payment (direkt completed)**

```
1. Customer zahlt 80 CHF, hat 100 CHF Credit
   
2. /api/payments/process:
   ✅ Deduct 80 CHF
   ✅ Create credit_transaction:
      {
        transaction_type: 'payment',
        amount_rappen: -8000,
        balance_before_rappen: 10000,
        balance_after_rappen: 2000,
        payment_method: 'credit',
        notes: 'Guthaben für Zahlung verwendet'
      }
   ✅ Mark payment as completed
   ✅ Return success

3. Customer Dashboard:
   ✅ Payment: completed
   ✅ Credit: 20 CHF
   ✅ Transaction History: -80 CHF (Payment)
```

### **Flow 2: Partial Credit + Successful Wallee**

```
1. Customer zahlt 100 CHF, hat 40 CHF Credit

2. /api/payments/process:
   ✅ Deduct 40 CHF immediately
   ✅ Store pending_credit_refund: 4000 in metadata
   ✅ Create Wallee transaction for 60 CHF
   ✅ Redirect to Wallee

3. Customer zahlt 60 CHF via Wallee

4. Wallee Webhook: FULFILL
   ✅ Update payment: completed
   ✅ confirmCreditDeduction():
      - Create credit_transaction:
        {
          transaction_type: 'payment',
          amount_rappen: -4000,
          balance_before_rappen: 4000,
          balance_after_rappen: 0,
          payment_method: 'credit',
          notes: 'Guthaben für Zahlung verwendet'
        }
      - Clear pending_credit_refund

5. Customer Dashboard:
   ✅ Payment: completed
   ✅ Credit: 0 CHF
   ✅ Transaction History: -40 CHF (Payment)
```

### **Flow 3: Partial Credit + Failed Wallee (ROLLBACK!)**

```
1. Customer zahlt 100 CHF, hat 40 CHF Credit

2. /api/payments/process:
   ✅ Deduct 40 CHF immediately
   ✅ Store pending_credit_refund: 4000 in metadata
   ✅ Create Wallee transaction for 60 CHF
   ✅ Redirect to Wallee

3. Customer bricht Wallee-Zahlung ab

4. Wallee Webhook: FAILED
   ✅ Update payment: failed
   ✅ handleCreditRefund():
      - Refund 40 CHF to student_credits
      - Create credit_transaction:
        {
          transaction_type: 'refund',
          amount_rappen: 4000, // Positive!
          balance_before_rappen: 0,
          balance_after_rappen: 4000,
          payment_method: 'wallee_failed',
          notes: 'Rückerstattung wegen fehlgeschlagener Wallee-Zahlung'
        }
      - Mark credit_refunded: true in metadata
      - Clear pending_credit_refund

5. Customer Dashboard:
   ✅ Payment: failed
   ✅ Credit: 40 CHF (zurückerstattet!)
   ✅ Transaction History:
      - -40 CHF (Payment) [ursprüngliche Abzug]
      - +40 CHF (Refund) [Rückerstattung]
```

---

## 📊 credit_transactions Table Structure

```typescript
{
  id: uuid,
  user_id: uuid,
  tenant_id: uuid,
  transaction_type: 'payment' | 'refund' | 'credit_product_purchase' | 'cancellation',
  amount_rappen: integer, // Negative for deductions, positive for additions
  balance_before_rappen: integer,
  balance_after_rappen: integer,
  payment_method: 'credit' | 'wallee_failed' | 'refund',
  reference_id: uuid, // payment.id
  reference_type: 'payment',
  notes: string,
  status: 'completed',
  created_at: timestamp
}
```

---

## ✅ WHAT WAS FIXED

### Before:
```
❌ No credit_transaction entries
❌ Credit lost on Wallee failures
❌ No audit trail
❌ Customer confused about credit changes
❌ No refund documentation
```

### After:
```
✅ Every credit operation creates transaction
✅ Automatic rollback on Wallee failure
✅ Complete audit trail
✅ Customer sees full history
✅ Refunds documented and visible
✅ Balance before/after tracked
```

---

## 🧪 TESTING CHECKLIST

### Test 1: Full Credit Payment
```
Setup:
- User mit 100 CHF Credit
- Payment von 80 CHF

Steps:
1. Click "Jetzt bezahlen"
2. Should complete immediately (no Wallee)

Verify:
✅ Payment status: completed
✅ Credit balance: 20 CHF
✅ credit_transactions entry:
   - type: 'payment'
   - amount_rappen: -8000
   - balance_after_rappen: 2000
```

### Test 2: Partial Credit + Wallee Success
```
Setup:
- User mit 40 CHF Credit
- Payment von 100 CHF

Steps:
1. Click "Jetzt bezahlen"
2. Redirect to Wallee for 60 CHF
3. Complete Wallee payment

Verify:
✅ Payment status: completed
✅ Credit balance: 0 CHF
✅ credit_transactions entry (created by webhook):
   - type: 'payment'
   - amount_rappen: -4000
   - balance_after_rappen: 0
```

### Test 3: Partial Credit + Wallee Failure (CRITICAL!)
```
Setup:
- User mit 40 CHF Credit
- Payment von 100 CHF

Steps:
1. Click "Jetzt bezahlen"
2. Redirect to Wallee for 60 CHF
3. Click "Zurück" / Cancel payment

Verify:
✅ Payment status: failed
✅ Credit balance: 40 CHF (REFUNDED!)
✅ credit_transactions entries:
   1. (Deduction - from initial API call) - might not exist if webhook fast
   2. (Refund - from webhook)
      - type: 'refund'
      - amount_rappen: 4000
      - balance_after_rappen: 4000
      - payment_method: 'wallee_failed'
✅ payment.metadata.credit_refunded: true
```

---

## 🚨 IMPORTANT NOTES

### 1. Transaction Timing

**Full Credit:**
- Transaction created immediately by API
- No webhook involved

**Partial Credit + Wallee:**
- Transaction created by webhook AFTER Wallee completes
- This is intentional (wait for final state)

### 2. Refund Safety

```typescript
// Stored in payment.metadata during API call:
{
  pending_credit_refund: 4000 // Amount to refund if payment fails
}

// Webhook checks this and refunds if payment fails
// Then clears flag:
{
  pending_credit_refund: null,
  credit_refunded: true,
  credit_refunded_at: "2026-01-12T..."
}
```

### 3. Balance Reconstruction

In `confirmCreditDeduction()`, we reconstruct `balance_before` because credit was already deducted:

```typescript
const currentBalance = 0 // Current (after deduction)
const creditUsed = 4000
const balanceBefore = currentBalance + creditUsed // = 4000
```

This ensures accurate transaction history.

---

## 📈 BENEFITS

### For Customers:
```
✅ See exactly what credit was used
✅ See refunds when payments fail
✅ Trust the system (transparent)
✅ Never lose credit
```

### For Business:
```
✅ Complete audit trail
✅ Easy debugging of credit issues
✅ Compliance with financial regulations
✅ Customer support has full history
```

### For Developers:
```
✅ Single source of truth (credit_transactions)
✅ Easy to debug credit issues
✅ No guessing about credit flow
✅ Automatic documentation
```

---

## 🔮 FUTURE IMPROVEMENTS

### 1. Transaction Display in UI
```typescript
// In Customer Dashboard, show credit transaction history:
<TransactionHistory>
  <Transaction type="payment" amount="-80.00 CHF" date="2026-01-12" />
  <Transaction type="refund" amount="+40.00 CHF" date="2026-01-11" />
  <Transaction type="credit_product" amount="+100.00 CHF" date="2026-01-10" />
</TransactionHistory>
```

### 2. Email Notifications
```
When refund happens:
→ Send email: "Guthaben von CHF 40.00 wurde zurückerstattet"
→ Include reason: "Wallee-Zahlung fehlgeschlagen"
```

### 3. Retry Failed Payments
```
If payment failed and credit was refunded:
→ Show "Erneut versuchen" button
→ Credit still available for retry
```

---

**STATUS:** ✅ Production Ready  
**DEPLOYED:** 2026-01-12  
**COMMITS:** `847481c` + `254f69c`  
**PRIORITY:** CRITICAL (prevents credit loss)

