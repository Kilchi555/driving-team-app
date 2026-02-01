# Migration Task List - Week 1-3 Sprint

## TIER 1: CRITICAL (Week 1) - 474 queries total

### Monday - EventModal.vue (50+ queries)
- [ ] Analyze all direct Supabase queries in EventModal.vue
- [ ] Create composable: `useEventManagement.ts`
- [ ] Implement API endpoints:
  - /api/appointments/create-with-payments
  - /api/appointments/update-event
  - /api/appointments/cancel
  - /api/appointments/get-event-details
- [ ] Migrate template to use composable
- [ ] Remove getSupabase import
- [ ] Test: Event creation flow
- [ ] Test: Event editing flow
- [ ] Test: Event cancellation

### Tuesday - CalendarComponent.vue (26 queries) + CustomerDashboard.vue (13 queries)
- [ ] Analyze CalendarComponent.vue queries
- [ ] Create composable: `useCalendarEvents.ts`
- [ ] Implement API endpoints:
  - /api/calendar/get-events
  - /api/calendar/get-working-hours
  - /api/calendar/get-busy-times
- [ ] Migrate CalendarComponent to use composable
- [ ] Analyze CustomerDashboard.vue queries
- [ ] Create composable: `useCustomerDashboard.ts`
- [ ] Implement API endpoints:
  - /api/customer/get-dashboard-data
  - /api/customer/get-appointments
- [ ] Migrate CustomerDashboard to use composable
- [ ] Test: Calendar display
- [ ] Test: Customer dashboard load

### Wednesday - EnhancedStudentModal.vue (27 queries) + Payment components (68 queries)
- [ ] Analyze EnhancedStudentModal.vue queries
- [ ] Create composable: `useStudentManagement.ts`
- [ ] Implement API endpoints:
  - /api/students/get-by-id
  - /api/students/create
  - /api/students/update
  - /api/students/get-documents
- [ ] Migrate EnhancedStudentModal to use composable
- [ ] Analyze admin/UserPaymentDetails.vue queries
- [ ] Create composable: `useAdminPayments.ts`
- [ ] Implement API endpoints:
  - /api/admin/payments/get-by-user
  - /api/admin/payments/get-history
  - /api/admin/payments/update-status
- [ ] Migrate UserPaymentDetails to use composable
- [ ] Test: Student modal CRUD
- [ ] Test: Payment details display

### Thursday - Admin Pages (86 + 50 + 28 + 41 + 31 = 236 queries)
- [ ] Analyze admin/EvaluationSystemManagerInline.vue (86 queries)
- [ ] Create composable: `useEvaluationManagement.ts`
- [ ] Implement API endpoints: /api/admin/evaluations/*
- [ ] Migrate to composable
- [ ] Analyze admin/categories.vue (50 queries)
- [ ] Create composable: `useCategoryManagement.ts`
- [ ] Implement API endpoints: /api/admin/categories/*
- [ ] Migrate to composable
- [ ] Analyze admin/CashBalanceManager.vue (28 queries)
- [ ] Create composable: `useCashManagement.ts`
- [ ] Analyze components/admin/ReglementeManager.vue (41 queries)
- [ ] Create composable: `useRuleManagement.ts`
- [ ] Analyze pages/booking/availability/[slug].vue (31 queries)
- [ ] Create composable: `useAvailabilityManagement.ts`

### Friday - Testing + QA Week 1
- [ ] E2E tests for all TIER 1 components
- [ ] Performance testing: API response times
- [ ] Security audit: Authorization checks
- [ ] Tenant isolation verification
- [ ] Regression testing: Existing features
- [ ] Code review: All composables + APIs
- [ ] Prepare TIER 2 API specifications

---

## TIER 2: HIGH PRIORITY (Week 2) - 320 queries total

### Monday - Admin Pages Part 1
- [ ] pages/admin/courses.vue (72 queries)
  - Create composable: `useCourseManagement.ts`
  - Implement: /api/admin/courses/*
- [ ] components/users/StaffTab.vue (37 queries)
  - Create composable: `useStaffTab.ts`
  - Implement: /api/admin/staff/*
- [ ] pages/admin/discounts.vue (14 queries)
  - Create composable: `useDiscountManagement.ts`
  - Implement: /api/admin/discounts/*

### Tuesday - Admin Pages Part 2
- [ ] pages/admin/products.vue (16 queries)
  - Create composable: `useProductManagement.ts`
- [ ] pages/admin/examiners.vue (14 queries)
  - Create composable: `useExaminerManagement.ts`
- [ ] pages/admin/exam-statistics.vue (12 queries)
  - Create composable: `useExamStatistics.ts`
- [ ] pages/tenant-admin/security.vue (12 queries)
  - Create composable: `useTenantSecurity.ts`
- [ ] components/users/AdminsTab.vue (15 queries)
  - Create composable: `useAdminsTab.ts`
- [ ] Remaining admin pages (80 queries)
  - Prioritize by frequency of use

### Wednesday - Utility & Cleanup
- [ ] Remaining TIER 2 pages
- [ ] Remove unused getSupabase imports (45+ files)
- [ ] Add deprecation warnings
- [ ] Documentation for team

---

## TIER 3: MEDIUM PRIORITY (Week 2-3) - 267 queries total

- [ ] components/ExamResultModal.vue (5 queries)
- [ ] components/ExamLocationSelector.vue (11 queries)
- [ ] components/PriceDisplay.vue (5 queries)
- [ ] components/DurationSelector.vue (2 queries)
- [ ] components/CategorySelector.vue (4 queries)
- [ ] components/StaffCashBalance.vue (4 queries)
- [ ] components/EvaluationModal.vue (13 queries)
- [ ] components/CustomerInviteSelector.vue (8 queries)
- [ ] components/booking/LoginRegisterModal.vue (4 queries)
- [ ] components/PendenzenModal.vue (4 queries)
- [ ] ... and 30+ more with < 5 queries each

---

## CLEANUP & HARDENING (Week 3)

- [ ] Final comprehensive testing
- [ ] Performance benchmarking
- [ ] Security audit review
- [ ] Team knowledge transfer
- [ ] Documentation finalization
- [ ] Prepare for RLS enforcement
- [ ] Create CI/CD checks for "no getSupabase"

---

## Daily Standup Template

**Time**: 15 mins, every morning

**Agenda**:
1. Yesterday's completed tasks (TIER 1)?
2. Today's planned work?
3. Blockers or issues?
4. API endpoint needs for tomorrow?
5. Any QA findings?

**Track**: Maintaining 3-5 components per developer per day

---

## Success Criteria

### By EOD Friday (Week 1)
- [ ] All 10 TIER 1 components migrated
- [ ] All related API endpoints created
- [ ] 0 direct queries in TIER 1 files
- [ ] All E2E tests passing
- [ ] Code reviewed and merged

### By EOD Tuesday (Week 2)
- [ ] All TIER 2 admin pages migrated
- [ ] Unused imports cleaned up
- [ ] Documentation complete

### By EOD Wednesday (Week 3)
- [ ] All TIER 3 components migrated
- [ ] Full test suite passing
- [ ] Ready for RLS enforcement

---

## Rollback Plan

If critical issues in production:

1. Identify problematic component
2. Switch feature flag OFF
3. Revert to old code (kept temporarily)
4. Investigate root cause
5. Fix and re-test locally
6. Redeploy once verified

---

## Notes

- Keep old code for 1-2 weeks as safety net
- Use feature flags for switching between old/new
- Run both implementations in parallel during transition
- Monitor performance metrics closely
- Report issues immediately to team lead
