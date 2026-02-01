# ⚡ BATCH 1: QUICK WINS - Hit 30% TODAY!

## 🎯 STRATEGY: Skip Complex, Hit Small Wins

**ExamLocationSearchDropdown** is TOO COMPLEX (13 queries, lots of logic).
**Better to hit 5-10 small components (1-3 queries each) for faster progress!**

---

## ✅ READY TO MIGRATE (TINY COMPONENTS)

### Tier 1: 1-2 Queries Each (FASTEST - 5 mins per component)
- [ ] StudentSelector.vue (1) - 5 mins
- [ ] ProductSaleModal.vue (1) - 5 mins
- [ ] EventTypeSelector.vue (1) - 5 mins
- [ ] RedeemVoucherModal.vue (1) - 5 mins
- [ ] UpcomingLessonsModal.vue (1) - 5 mins
- [ ] CourseEnrollmentModal.vue (2) - 7 mins
- [ ] DurationSelector.vue (4) - 10 mins
- [ ] DeviceManager.vue (4) - 10 mins
- [ ] MoveAppointmentModal.vue (4) - 10 mins
- [ ] PostAppointmentModal.vue (4) - 10 mins
- [ ] ProfileModal.vue (4) - 10 mins
- [ ] PaymentModal.vue (4) - 10 mins

**Subtotal: 37 queries = 1.5 hours**

### Tier 2: 5-7 Queries Each (MEDIUM - 15 mins per component)
- [ ] PriceDisplay.vue (7)
- [ ] CashTransactionModal.vue (7)
- [ ] StaffCashBalance.vue (6)
- [ ] StaffDurationSettings.vue (7)
- [ ] ExamResultModal.vue (7)
- [ ] PendenzenModal.vue (6)
- [ ] CustomerDashboard.vue (2)
- [ ] LoginRegisterModal.vue (8)
- [ ] RegistrationForm.vue (9)
- [ ] DocumentUploadModal.vue (9)
- [ ] CategorySelector.vue (5)

**Subtotal: 88 queries = 2.5 hours**

### Tier 3: COMPLEX (Skip for Now)
- [ ] ExamLocationSearchDropdown.vue (13) - TOO COMPLEX, save for later
- Other very complex components

---

## 🚀 MEGA AGGRESSIVE PLAN

**IF WE HIT TIER 1 (37 queries in 1.5 hours):**
- Current: 105 queries (21.1%)
- After Tier 1: 142 queries (28.5%)
- **Close to 30%!**

**IF WE HIT TIER 1 + TIER 2 (125 queries in 4 hours total):**
- Current: 105 queries (21.1%)
- After Both: 230 queries (46.3%)
- **NEARLY 50%! STAFF+CLIENT ALMOST COMPLETE!**

---

## 📝 PATTERN (Reusable for All)

```typescript
// 1. REMOVE IMPORT & INIT (30 seconds)
// Delete: import { getSupabase } from '~/utils/supabase'
// Delete: const supabase = getSupabase()

// 2. FIND QUERIES (1 minute)
// Search: await supabase.from(

// 3. REPLACE (5-10 minutes)
// Replace pattern:
// OLD: const { data, error } = await supabase.from('table').select(...).eq(...)
// NEW: const response = await $fetch('/api/endpoint', {
//        method: 'POST',
//        body: { action: 'get-data', ...params }
//      }) as any
//      const data = response.data

// 4. VERIFY (1 minute)
// Check: No "await supabase" left
// Check: Component compiles
```

---

## 🎊 END GOAL FOR TODAY

- **Current**: 105 queries (21.1%)
- **Target**: 230+ queries (46%+)
- **Stretch**: 280+ queries (56%+)

**STAFF+CLIENT = 90%+ SAFE!**

---

## WHO SHOULD DO THIS?

Given token constraints, suggest:
1. Use the **PATTERN** above
2. Migrate **1-2 query components first** (super fast wins)
3. Build momentum
4. Then tackle medium ones

**Each component: 5-15 minutes max!**

🔥 **LET'S GO!** 🔥
