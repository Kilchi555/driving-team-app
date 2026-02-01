# 📊 DETAILED BREAKDOWN: 656 DIRECT SUPABASE QUERIES IN CLIENT CODE

**Status:** CRITICAL SECURITY ISSUE
**Total Queries:** 656
**Total Affected Files:** 122

---

## 🔴 PAGES (198 queries in 44 pages)

### CRITICAL PAGES (Highest Risk)
| Page | Queries | Risk |
|------|---------|------|
| `pages/admin/courses.vue` | 32 | 🔴 CRITICAL |
| `pages/admin/categories.vue` | 23 | 🔴 CRITICAL |
| `pages/admin/profile.vue` | 15 | 🔴 CRITICAL |
| `pages/admin/products.vue` | 8 | 🔴 CRITICAL |
| `pages/admin/discounts.vue` | 7 | 🔴 CRITICAL |
| `pages/admin/exam-statistics.vue` | 7 | 🔴 CRITICAL |
| `pages/admin/examiners.vue` | 7 | 🔴 CRITICAL |
| `pages/admin/users/index.vue` | 7 | 🔴 CRITICAL |
| `pages/tenant-admin/security.vue` | 6 | 🔴 CRITICAL |

### OTHER PAGES
- `pages/register/[tenant].vue` - 5 queries
- `pages/shop.vue` - 5 queries  
- `pages/tenant-admin/business-types.vue` - 5 queries
- `pages/AdminEventTypes.vue` - 4 queries
- `pages/admin/student-credits.vue` - 4 queries
- `pages/anonymous-sale/[id].vue` - 4 queries
- `pages/booking/availability/[slug].vue` - 4 queries
- `pages/customers.vue` - 4 queries
- `pages/tenant-admin/index.vue` - 4 queries
- `pages/tenant-admin/tenants.vue` - 4 queries
- ...and 34 more pages with 1-3 queries each

**PAGES TOTAL: 44 files, 198 queries**

---

## 🟠 COMPONENTS (244 queries in 40+ components)

### MOST CRITICAL COMPONENTS
| Component | Queries | Type | Risk |
|-----------|---------|------|------|
| `components/admin/EvaluationSystemManagerInline.vue` | 39 | Admin | 🔴🔴🔴 |
| `components/admin/UserPaymentDetails.vue` | 34 | Admin | 🔴🔴🔴 |
| `components/admin/ReglementeManager.vue` | 20 | Admin | 🔴🔴 |
| `components/users/StaffTab.vue` | 18 | Admin | 🔴🔴 |
| `components/admin/EventTypesManager.vue` | 15 | Admin | 🔴🔴 |
| `components/PaymentComponent.vue` | 14 | Payment | 🔴🔴 |
| `components/admin/CashBalanceManager.vue` | 14 | Admin | 🔴🔴 |
| `components/ExamLocationSearchDropdown.vue` | 13 | Search | 🔴 |
| `components/EnhancedStudentModal.vue` | 12 | Modal | 🔴 |
| `components/admin/CashControlDashboard.vue` | 8 | Admin | 🔴🔴 |

### OTHER COMPONENTS (30+ more)
- `components/ExamLocationSelector.vue` - 5
- `components/ExternalCalendarSettings.vue` - 5
- `components/CustomerInviteSelector.vue` - 4
- `components/EvaluationModalNew.vue` - 4
- `components/users/CustomersTab.vue` - 4
- `components/CashTransactionModal.vue` - 3
- ...and 25 more with 1-3 queries each

**COMPONENTS TOTAL: 40+ files, 244 queries**

---

## 🟡 COMPOSABLES (209 queries in 42 composables)

### MOST CRITICAL COMPOSABLES
| Composable | Queries | Risk |
|-----------|---------|------|
| `composables/useHybridDiscounts.ts` | 16 | 🔴🔴 |
| `composables/useCourseParticipants.ts` | 14 | 🔴🔴 |
| `composables/useReminderService.ts` | 14 | 🔴🔴 |
| `composables/useGeneralResourceBookings.ts` | 10 | 🔴 |
| `composables/useOfficeCashRegisters.ts` | 10 | 🔴🔴 |
| `composables/useGeneralResources.ts` | 8 | 🔴 |
| `composables/useUserDocuments.ts` | 8 | 🔴 |
| `composables/useProductSales.ts` | 7 | 🔴 |
| `composables/useRoomReservations.ts` | 7 | 🔴 |
| `composables/useStudents.ts` | 7 | 🔴 |

### OTHER COMPOSABLES (32+ more)
- `composables/useAdminHierarchy.ts` - 6
- `composables/useAutoPayment.ts` - 6
- `composables/useCancellationStats.ts` - 6
- `composables/useDiscountsConsolidated.ts` - 6
- `composables/useDurationManager.ts` - 6
- `composables/useVehicleReservations.ts` - 6
- ...and 26 more with 1-5 queries each

**COMPOSABLES TOTAL: 42 files, 209 queries**

---

## 🟢 STORES (5 queries in 2 stores)

| Store | Queries | Risk |
|-------|---------|------|
| `stores/auth.ts` | 4 | 🔴 |
| `stores/loading.ts` | 1 | 🟡 |

**STORES TOTAL: 2 files, 5 queries**

---

## 📈 SUMMARY BY CATEGORY

| Category | Files | Queries | % |
|----------|-------|---------|---|
| Pages | 44 | 198 | 30% |
| Components | 40+ | 244 | 37% |
| Composables | 42 | 209 | 32% |
| Stores | 2 | 5 | 1% |
| **TOTAL** | **122** | **656** | **100%** |

---

## 🔥 PRIORITY RANKING

### Priority 1 (DO FIRST - Most Critical)
1. `pages/admin/courses.vue` - 32 queries
2. `pages/admin/categories.vue` - 23 queries
3. `components/admin/EvaluationSystemManagerInline.vue` - 39 queries
4. `components/admin/UserPaymentDetails.vue` - 34 queries
5. `pages/admin/profile.vue` - 15 queries

**These 5 files have 143 queries (22% of total)**

### Priority 2 (DO NEXT)
- `components/admin/ReglementeManager.vue` - 20 queries
- `components/users/StaffTab.vue` - 18 queries
- `components/admin/EventTypesManager.vue` - 15 queries
- `composables/useHybridDiscounts.ts` - 16 queries
- `composables/useCourseParticipants.ts` - 14 queries

**These 5 files have 83 queries (13% of total)**

### Priority 3 (Medium)
- Remaining ~112 files with 430 queries (65% of total)

---

## 🎯 MIGRATION STRATEGY

### Phase 1: Secure High-Impact Files (5 files, 143 queries)
- Start with files that have most queries
- Often these have multiple operations that could be consolidated

### Phase 2: Security-Critical Composables (10 files, ~100 queries)
- Handle payment, cash, discounts, resources
- These likely have mutations that are critical

### Phase 3: Remaining Files (107 files, ~413 queries)
- Mostly read-only queries
- Can be done in batches

### Phase 4: Stores (2 files, 5 queries)
- Quick final step

---

## ⚠️ QUERY TYPES (ESTIMATED)

Based on patterns observed:
- **READ-ONLY** (~40%): SELECT queries (260 queries)
- **MUTATIONS** (~35%): INSERT, UPDATE, DELETE (230 queries) 🔴
- **RPC CALLS** (~15%): Stored procedures (100 queries) 🔴
- **STORAGE** (~5%): File uploads (6 queries) 🔴
- **AUTH** (~5%): Session operations (60 queries) 🔴

---

## 🚨 IMMEDIATE ACTIONS

1. **DO NOT DEPLOY** code with these queries to production
2. **REVIEW RLS policies** - Are they actually protecting data?
3. **CHECK AUDIT LOGS** - Any suspicious access?
4. **CREATE API ENDPOINTS** for the 143 high-priority queries first
5. **MIGRATE systematically** using priority ranking above

---

Generated: 2026-01-28
