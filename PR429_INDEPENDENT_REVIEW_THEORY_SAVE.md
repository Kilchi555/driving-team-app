# Independent Review — PR #429 Theory Appointment Save Fix

**Date:** 2026-10-14  
**Reviewer mode:** Read-only independent code and test review  
**PR:** https://github.com/Kilchi555/driving-team-app/pull/429  
**Branch:** `cursor/fix-theorielektionen-eventmodal-save-5224`  
**Reviewed HEAD:** `ac50b621c3225a20bcb73275acd0b68d9c30159c`  
**Base:** `0770ad2e53168ff01f7c45e575eee8c1566329c5` (`main`)

---

## Verdict

**CONDITIONAL PASS — SPECIFIC GAPS**

Baseline matches the reported SHAs. The fix correctly addresses the root cause and preserves server pricing authority. Remaining gaps: reachable hardcoded `8500` in `createPaymentEntry`, missing dedicated Theory **edit** tests, and no EventModal browser/E2E coverage for this path.

No merge, deploy, or production changes were performed during this review.

---

## 1. Baseline verification

| Field | Value |
|---|---|
| Repository | `Kilchi555/driving-team-app` |
| PR | #429 — OPEN, **draft**, MERGEABLE |
| Branch | `cursor/fix-theorielektionen-eventmodal-save-5224` |
| HEAD | `ac50b621c3225a20bcb73275acd0b68d9c30159c` (= reported) |
| Base | `0770ad2e53168ff01f7c45e575eee8c1566329c5` |
| Worktree | Clean, tracking origin branch |
| CI (observed) | Test and lint ✅, E2E login ✅ (not Theory EventModal E2E) |

No unexpected baseline drift. Review proceeded.

---

## 2. Changed files (10)

- `components/CategorySelector.vue`
- `components/EventModal.vue`
- `composables/useEventModalForm.ts`
- `composables/usePricing.ts`
- `utils/theory-client-price.ts` *(new)*
- `utils/appointment-save-error.ts` *(new)*
- `utils/__tests__/theory-client-price.test.ts` *(new)*
- `server/utils/__tests__/quote-staff-appointment.test.ts`
- `server/utils/__tests__/resolve-offer-price.test.ts`
- `server/utils/__tests__/staff-appointment-save-price.http.test.ts`

**Unchanged (confirmed by diff):**

- `server/utils/resolve-offer-price.ts`
- `server/utils/quote-staff-appointment.ts`
- `server/api/appointments/save.post.ts`

---

## 3. Verified data flow

```
EventModal (theoryPriceRuleMissing → Speichern disabled + warning)
  → useEventModalForm.saveAppointment
      pre-check: categoryHasTheoryPricing(...)   [create + edit]
  → POST /api/appointments/save
  → quoteStaffAppointmentOffer()
  → resolveOfferPrice(ruleTypeHint: 'theory')
  → without matching theory rule: NO_PRICE_RULE, no DB write
  → with matching theory rule: appointments + payments insert/update
```

| Requirement | Finding |
|---|---|
| UI no longer presents CHF 85 as a valid Theory price without a matching rule | **OK** — `usePricing` uses `clientTheoryLessonPriceRappen`; no `THEORY_BASE_RAPPEN` |
| Only categories with a valid Theory pricing rule selectable | **OK** — `CategorySelector` filters via `theoryEnabledCategories` + `syncTheoryCategorySelection` |
| Invalid category not silently preserved across change/init/edit/sync | **OK** — filter/sync; save also blocked |
| Save blocked before submission when no valid Theory rule | **OK** — button gated by `theoryPriceRuleMissing`; pre-save throw in `saveAppointment` |
| `NO_PRICE_RULE` / `statusMessage` mapped to clear German error; other errors not masked | **OK** — `appointmentSaveErrorMessage` |
| Server remains source of truth; rejects unpriced Theory before write | **OK** — server pricing files untouched; fail-closed intact |
| Exam pricing unchanged | **OK** — exam→`base_price` fallback only; exam tests still pass |
| Tenant scoping / authorization not weakened | **OK** — no auth/RLS changes; cross-tenant theory rule rejected in tests |

---

## 4. Hardcoded CHF 85 — `createPaymentEntry`

**Reachable, currently non-persisting, regression hazard.**

Location: `composables/useEventModalForm.ts` (~lines 1329–1558).

Evidence:

1. Called only after a **successful create** save (`mode === 'create'`, ~1225–1227).
2. For `appointmentType === 'theory'` sets `lessonPriceRappen = 8500` (~1338) and builds `paymentData`.
3. Does **not** call any payment API; logs and `return null`.
4. Errors are swallowed in `catch` → `return null`.
5. Edit path uses `updatePaymentEntry`, also a no-op (server owns payment fields).

**Assessment:** Does not currently affect displayed UI amounts or persisted payment rows (server quote already wrote the payment). It remains a **future regression hazard** if someone re-wires `paymentData` to a create-payment endpoint. Follow-up recommended: remove the hardcode or reduce the function to an explicit documented no-op.

---

## 5. Test validation

### Command executed (local, isolated)

```bash
./node_modules/.bin/vitest run \
  utils/__tests__/theory-client-price.test.ts \
  server/utils/__tests__/quote-staff-appointment.test.ts \
  server/utils/__tests__/resolve-offer-price.test.ts \
  server/utils/__tests__/staff-appointment-save-price.http.test.ts
```

### Result

- **4 files / 103 tests passed**
- **Exit code: 0**

### Coverage against review checklist

| Point | Status |
|---|---|
| Theory with valid rule | ✅ Quote + Save HTTP |
| Theory without rule: fail closed, no writes | ✅ |
| Category A has Theory rule, B does not | ✅ Quote + `categoryHasTheoryPricing` unit |
| `NO_PRICE_RULE` when `data.message` absent but `statusMessage` present | ✅ Unit |
| Exam fallback unchanged | ✅ Existing exam tests |
| Tenant isolation | ✅ Other-tenant theory rule rejected |
| Create path Theory | ✅ Save HTTP |
| **Edit path Theory** | ❌ **No dedicated Theory edit test** |
| EventModal browser / E2E | ❌ Not present / not run |

Note: Some frontend assertions are source-string checks (weaker). Server quote/save coverage is substantive.

---

## 6. E2E gaps

- No automated or manual EventModal Theory create/edit browser verification in this review.
- CI “E2E login” success does **not** cover this Theory save path.

---

## 7. Required follow-up

1. Remove hardcoded `8500` from `createPaymentEntry` (or collapse to documented no-op).
2. Add at least one **edit-mode Theory** test: valid rule saves; missing rule → `NO_PRICE_RULE` and no write.
3. Optional: short manual/browser check — Theory create + edit with and without category Theory rule.

---

## 8. Confirmations

- No production data accessed or written.
- No files were modified for the review itself (this Markdown is an artifact of the user’s “always MD” directive).
- No approve / merge / auto-merge / workflow re-run / deploy performed by the reviewer.

---

*End of independent review report.*
